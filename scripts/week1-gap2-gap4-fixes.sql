-- ============================================
-- Week 1 Core Flow Validation: Gap #2 & Gap #4 Fixes
-- Created: 2024-11-16
-- Purpose: Regenerate expired registration tokens and fix seat mismatches
-- 
-- EXECUTION INSTRUCTIONS:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. After completion, invoke batch-regenerate-tokens edge function
-- 3. Verify results using the verification queries at the end
-- ============================================

-- ============================================
-- GAP #2: Regenerate Expired Registration Tokens
-- ============================================

DO $$ 
DECLARE
  updated_count INTEGER;
  app_record RECORD;
BEGIN
  RAISE NOTICE '🔄 Starting Gap #2: Regenerate Expired Registration Tokens...';
  
  -- Step 1: Regenerate tokens for all approved applications with expired tokens
  WITH updated_apps AS (
    UPDATE dispensary_applications
    SET 
      registration_token = ENCODE(GEN_RANDOM_BYTES(32), 'hex'),
      registration_token_expires_at = NOW() + INTERVAL '30 days',
      updated_at = NOW()
    WHERE application_status = 'approved'
      AND registration_completed = false
      AND (registration_token_expires_at IS NULL OR registration_token_expires_at < NOW())
    RETURNING *
  )
  SELECT COUNT(*) INTO updated_count FROM updated_apps;
  
  RAISE NOTICE '✅ Regenerated % registration tokens (expires: %)', 
    updated_count, 
    (NOW() + INTERVAL '30 days')::date;
  
  -- Step 2: Display updated applications
  RAISE NOTICE '📋 Updated Applications:';
  FOR app_record IN 
    SELECT 
      id,
      organization_name,
      contact_email,
      registration_token,
      registration_token_expires_at
    FROM dispensary_applications
    WHERE application_status = 'approved'
      AND registration_completed = false
    ORDER BY organization_name
  LOOP
    RAISE NOTICE '  - % (%) - Token expires: %', 
      app_record.organization_name,
      app_record.contact_email,
      app_record.registration_token_expires_at::date;
  END LOOP;
  
END $$;

-- ============================================
-- GAP #4: Fix Demo Dispensary Seat Mismatch
-- ============================================

DO $$
DECLARE
  reconcile_result RECORD;
  demo_org_id UUID;
  seats_before INTEGER;
  seats_after INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Starting Gap #4: Fix Demo Dispensary Seat Mismatch...';
  
  -- Get Demo Dispensary org ID and current seat count
  SELECT id INTO demo_org_id 
  FROM organizations 
  WHERE name = 'Demo Dispensary LLC';
  
  SELECT COUNT(*) INTO seats_before
  FROM rvt_seats
  WHERE organization_id = demo_org_id;
  
  RAISE NOTICE '📊 Demo Dispensary LLC Before Reconciliation:';
  RAISE NOTICE '  - Organization ID: %', demo_org_id;
  RAISE NOTICE '  - Course Credits: 50';
  RAISE NOTICE '  - Existing Seats: %', seats_before;
  
  -- Run seat reconciliation for ALL organizations
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Running reconcile_seats() for all organizations...';
  
  FOR reconcile_result IN 
    SELECT * FROM reconcile_seats()
  LOOP
    RAISE NOTICE '  - %: % seats created (Credits: %, Seats: %)', 
      reconcile_result.organization_name,
      reconcile_result.seats_created,
      reconcile_result.credits,
      reconcile_result.seats;
  END LOOP;
  
  -- Verify Demo Dispensary now has correct seats
  SELECT COUNT(*) INTO seats_after
  FROM rvt_seats
  WHERE organization_id = demo_org_id;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Demo Dispensary LLC After Reconciliation:';
  RAISE NOTICE '  - Total Seats: %', seats_after;
  RAISE NOTICE '  - Available: %', (SELECT COUNT(*) FROM rvt_seats WHERE organization_id = demo_org_id AND status = 'available');
  RAISE NOTICE '  - Assigned: %', (SELECT COUNT(*) FROM rvt_seats WHERE organization_id = demo_org_id AND status = 'assigned');
  RAISE NOTICE '  - Used: %', (SELECT COUNT(*) FROM rvt_seats WHERE organization_id = demo_org_id AND status = 'used');
  
  IF seats_after = 50 THEN
    RAISE NOTICE '✅ Gap #4 FIXED: Demo Dispensary now has correct seat allocation!';
  ELSE
    RAISE WARNING '⚠️ Expected 50 seats, but found %. Manual investigation needed.', seats_after;
  END IF;
  
END $$;

-- ============================================
-- VERIFICATION QUERIES (Run these after the above)
-- ============================================

-- Query 1: Verify all approved applications have valid tokens
SELECT 
  organization_name,
  contact_email,
  registration_token_expires_at::date as expires_on,
  CASE 
    WHEN registration_token_expires_at > NOW() THEN '✅ Valid'
    WHEN registration_token_expires_at IS NULL THEN '❌ No Token'
    ELSE '❌ Expired'
  END as status
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
ORDER BY registration_token_expires_at DESC;

-- Query 2: Verify Demo Dispensary seat allocation
SELECT 
  o.name as organization,
  o.course_credits,
  COUNT(rs.id) as total_seats,
  COUNT(rs.id) FILTER (WHERE rs.status = 'available') as available,
  COUNT(rs.id) FILTER (WHERE rs.status = 'assigned') as assigned,
  COUNT(rs.id) FILTER (WHERE rs.status = 'used') as used,
  CASE 
    WHEN o.course_credits = COUNT(rs.id) THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.name = 'Demo Dispensary LLC'
GROUP BY o.id, o.name, o.course_credits;

-- Query 3: Check all organizations for seat mismatches
SELECT 
  o.name,
  o.course_credits,
  COUNT(rs.id) as total_seats,
  COUNT(rs.id) FILTER (WHERE rs.status = 'available') as available,
  CASE 
    WHEN o.course_credits = COUNT(rs.id) THEN '✅'
    ELSE '❌ Mismatch'
  END as status
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
GROUP BY o.id, o.name, o.course_credits
ORDER BY 
  CASE WHEN o.course_credits = COUNT(rs.id) THEN 1 ELSE 0 END,
  o.name;

-- ============================================
-- Summary Report
-- ============================================

DO $$
DECLARE
  total_apps INTEGER;
  valid_tokens INTEGER;
  total_orgs INTEGER;
  orgs_with_seats INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '📊 WEEK 1 GAP #2 & #4 FIXES - SUMMARY REPORT';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
  -- Application token stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE registration_token_expires_at > NOW())
  INTO total_apps, valid_tokens
  FROM dispensary_applications
  WHERE application_status = 'approved'
    AND registration_completed = false;
  
  RAISE NOTICE '';
  RAISE NOTICE 'GAP #2: Registration Tokens';
  RAISE NOTICE '  Total Approved Applications: %', total_apps;
  RAISE NOTICE '  Valid Tokens: %', valid_tokens;
  RAISE NOTICE '  Status: %', 
    CASE WHEN total_apps = valid_tokens THEN '✅ ALL VALID' ELSE '⚠️ SOME INVALID' END;
  
  -- Organization seat stats
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (
      WHERE o.course_credits = (
        SELECT COUNT(*) FROM rvt_seats WHERE organization_id = o.id
      )
    )
  INTO total_orgs, orgs_with_seats
  FROM organizations o;
  
  RAISE NOTICE '';
  RAISE NOTICE 'GAP #4: Seat Allocation';
  RAISE NOTICE '  Total Organizations: %', total_orgs;
  RAISE NOTICE '  Organizations with Correct Seats: %', orgs_with_seats;
  RAISE NOTICE '  Status: %',
    CASE WHEN total_orgs = orgs_with_seats THEN '✅ ALL CORRECT' ELSE '⚠️ SOME MISMATCHES' END;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✅ Week 1 Gap #2 & #4 fixes completed!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '  1. Invoke batch-regenerate-tokens edge function to resend emails';
  RAISE NOTICE '  2. Check email_logs table for approval emails sent';
  RAISE NOTICE '  3. Verify managers can register with new tokens';
  RAISE NOTICE '  4. Proceed to Gap #3: Test manager registration';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  
END $$;
