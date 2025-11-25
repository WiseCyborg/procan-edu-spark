-- ================================================================
-- PIPELINE VALIDATION TEST SUITE
-- Run these queries sequentially to validate each gap fix
-- ================================================================

-- ================================================================
-- PRE-TEST: SYSTEM HEALTH CHECK
-- ================================================================

-- Check cron jobs are running (should see recent executions)
SELECT 
  job_name,
  status,
  executed_at,
  execution_time_ms,
  error_message
FROM cron_job_executions
ORDER BY executed_at DESC
LIMIT 20;

-- Check email circuit breaker status (should be 'closed')
SELECT 
  circuit_state,
  failure_count,
  last_failure_at,
  opened_at,
  half_open_at,
  closed_at
FROM email_circuit_breaker
ORDER BY updated_at DESC
LIMIT 1;

-- Check dead letter queue (should be empty or minimal)
SELECT 
  COUNT(*) as failed_notifications,
  MAX(created_at) as most_recent_failure
FROM notification_queue
WHERE status = 'failed';

-- ================================================================
-- GAP #2 VERIFICATION: Regenerated Registration Tokens
-- ================================================================

-- Before Fix: Check for expired tokens
SELECT 
  id,
  organization_name,
  contact_email,
  application_status,
  registration_token_expires_at,
  EXTRACT(DAY FROM (NOW() - registration_token_expires_at))::INTEGER as days_expired,
  registration_completed
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
  AND registration_token_expires_at < NOW()
ORDER BY registration_token_expires_at ASC;

-- Expected BEFORE: 7 expired applications
-- Expected AFTER: 0 expired applications

-- After Fix: Verify all approved applications have valid tokens (30 days from now)
SELECT 
  id,
  organization_name,
  contact_email,
  application_status,
  registration_token_expires_at,
  EXTRACT(DAY FROM (registration_token_expires_at - NOW()))::INTEGER as days_until_expiry,
  registration_token IS NOT NULL as has_token,
  registration_completed
FROM dispensary_applications
WHERE application_status = 'approved'
ORDER BY registration_token_expires_at ASC;

-- Expected: All approved apps should have tokens expiring ~30 days in future

-- Check that approval emails were queued
SELECT 
  id,
  email_type,
  recipient_email,
  status,
  created_at,
  scheduled_for,
  attempts
FROM notification_queue
WHERE email_type = 'application-approved'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- Expected: 7 new approval emails queued

-- ================================================================
-- GAP #4 VERIFICATION: Seat Allocation Fixed
-- ================================================================

-- Before Fix: Check seat mismatches
SELECT 
  o.id,
  o.name,
  o.course_credits,
  COUNT(rs.id) as actual_seats,
  (o.course_credits - COUNT(rs.id)) as deficit
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.course_credits > 0
GROUP BY o.id, o.name, o.course_credits
HAVING o.course_credits > COUNT(rs.id)
ORDER BY deficit DESC;

-- Expected BEFORE: Demo Dispensary LLC with 50 credits, 0 seats, 50 deficit
-- Expected AFTER: 0 organizations with deficit

-- After Fix: Verify Demo Dispensary has 50 seats
SELECT 
  o.name,
  o.course_credits as purchased_seats,
  COUNT(rs.id) as allocated_seats,
  COUNT(CASE WHEN rs.status = 'available' THEN 1 END) as available_seats,
  COUNT(CASE WHEN rs.status = 'assigned' THEN 1 END) as assigned_seats,
  COUNT(CASE WHEN rs.status = 'used' THEN 1 END) as used_seats
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.name = 'Demo Dispensary LLC'
GROUP BY o.id, o.name, o.course_credits;

-- Expected: 50 purchased, 50 allocated, 50 available

-- Verify active courses exist for seat allocation
SELECT 
  id,
  title,
  course_type,
  target_audience,
  is_active,
  payment_required
FROM courses
WHERE is_active = true;

-- Expected: At least 1 active course

-- ================================================================
-- GAP #3 VERIFICATION: Manager Registration
-- ================================================================

-- Get a valid registration URL to test with
SELECT 
  id,
  organization_name,
  contact_email,
  contact_person,
  registration_token,
  registration_token_expires_at,
  CONCAT(
    'https://procannedu.com/manager-registration?token=',
    registration_token
  ) as registration_url,
  EXTRACT(DAY FROM (registration_token_expires_at - NOW()))::INTEGER as days_until_expiry
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
  AND registration_token IS NOT NULL
  AND registration_token_expires_at > NOW()
ORDER BY created_at ASC
LIMIT 1;

-- Copy the registration_url and open in incognito browser

-- After Registration: Verify manager was created
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as registered_at,
  p.full_name,
  p.organization_id,
  o.name as organization_name,
  ur.role
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
WHERE ur.role = 'dispensary_manager'
ORDER BY u.created_at DESC
LIMIT 5;

-- Expected: New user with dispensary_manager role, linked to organization

-- Verify organization was created/linked
SELECT 
  id,
  name,
  course_credits,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- Verify application marked as completed
SELECT 
  id,
  organization_name,
  registration_completed,
  organization_id,
  updated_at
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = true
ORDER BY updated_at DESC;

-- ================================================================
-- GAP #5 VERIFICATION: Email System
-- ================================================================

-- Check emails sent in last 24 hours
SELECT 
  email_type,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(
    100.0 * COUNT(CASE WHEN status = 'sent' THEN 1 END) / COUNT(*),
    2
  ) as success_rate
FROM email_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY email_type
ORDER BY total_sent DESC;

-- Expected email types to see:
-- - application-submitted
-- - application-approved
-- - manager-welcome
-- - employee-invitation
-- - certificate-issued

-- Check notification queue processing
SELECT 
  status,
  COUNT(*) as count,
  MAX(created_at) as most_recent
FROM notification_queue
GROUP BY status;

-- Expected: Most should be 'sent', minimal 'pending' or 'failed'

-- Check email provider health
SELECT 
  provider_name,
  status,
  last_check_at,
  last_success_at,
  error_count,
  response_time_ms
FROM email_provider_health
ORDER BY last_check_at DESC;

-- Expected: Resend 'healthy', low error_count

-- ================================================================
-- GAP #6 VERIFICATION: 4-Step Manager Onboarding
-- ================================================================

-- Verify manager can see their organization details
SELECT 
  o.id,
  o.name,
  o.address,
  o.phone,
  o.license_number,
  o.course_credits,
  COUNT(DISTINCT rs.id) as total_seats,
  COUNT(DISTINCT CASE WHEN rs.status = 'available' THEN rs.id END) as available_seats,
  COUNT(DISTINCT CASE WHEN rs.status = 'assigned' THEN rs.id END) as assigned_seats
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.id IN (
  SELECT organization_id 
  FROM profiles 
  WHERE user_id IN (
    SELECT user_id FROM user_roles WHERE role = 'dispensary_manager'
  )
)
GROUP BY o.id;

-- Check staff invitations sent by managers
SELECT 
  si.id,
  si.organization_id,
  o.name as organization_name,
  si.invitee_email,
  si.invitee_name,
  si.role as invited_role,
  si.status,
  si.created_at,
  si.expires_at,
  EXTRACT(DAY FROM (si.expires_at - NOW()))::INTEGER as days_until_expiry
FROM staff_invitations si
JOIN organizations o ON o.id = si.organization_id
ORDER BY si.created_at DESC
LIMIT 10;

-- Expected: Recent invitations with 'pending' status

-- ================================================================
-- GAP #7 VERIFICATION: Employee Registration
-- ================================================================

-- Get an invitation link to test with
SELECT 
  si.id,
  si.invitee_email,
  si.invitee_name,
  si.role,
  si.invitation_token,
  o.name as organization_name,
  CONCAT(
    'https://procannedu.com/register?invitation=',
    si.invitation_token
  ) as registration_url,
  si.expires_at
FROM staff_invitations si
JOIN organizations o ON o.id = si.organization_id
WHERE si.status = 'pending'
  AND si.expires_at > NOW()
ORDER BY si.created_at DESC
LIMIT 1;

-- Copy registration_url and open in incognito browser

-- After Registration: Verify employee created with seat allocated
SELECT 
  u.id as user_id,
  u.email,
  u.created_at as registered_at,
  p.full_name,
  p.organization_id,
  o.name as organization_name,
  ur.role,
  rs.id as seat_id,
  rs.status as seat_status,
  rs.course_id,
  c.title as course_title
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN rvt_seats rs ON rs.assigned_user_id = u.id
LEFT JOIN courses c ON c.id = rs.course_id
WHERE ur.role = 'student'
ORDER BY u.created_at DESC
LIMIT 5;

-- Expected: New student with 'assigned' or 'used' seat

-- Verify seat was atomically allocated (no orphans)
SELECT 
  COUNT(*) as total_seats,
  COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
  COUNT(CASE WHEN status = 'assigned' THEN 1 END) as assigned,
  COUNT(CASE WHEN status = 'used' THEN 1 END) as used,
  COUNT(CASE WHEN assigned_user_id IS NULL AND status != 'available' THEN 1 END) as orphaned
FROM rvt_seats;

-- Expected: orphaned = 0

-- Verify invitation marked as accepted
SELECT 
  id,
  invitee_email,
  status,
  accepted_at,
  accepted_by_user_id
FROM staff_invitations
WHERE status = 'accepted'
ORDER BY accepted_at DESC
LIMIT 5;

-- ================================================================
-- GAP #8 VERIFICATION: Certificate Generation
-- ================================================================

-- Check course progress for students
SELECT 
  p.full_name,
  p.user_id,
  c.title as course_title,
  up.completed_modules,
  up.total_modules,
  ROUND(100.0 * up.completed_modules / NULLIF(up.total_modules, 0), 1) as completion_percentage,
  up.tier_status,
  up.updated_at as last_activity
FROM user_progress up
JOIN profiles p ON p.user_id = up.user_id
JOIN courses c ON c.id = up.course_id
WHERE up.total_modules > 0
ORDER BY up.updated_at DESC
LIMIT 10;

-- Check exam attempts
SELECT 
  ea.id,
  p.full_name,
  p.user_id,
  c.title as course_title,
  ea.total_score,
  ea.is_passed,
  ea.attempt_number,
  ea.completed_at,
  ea.time_taken
FROM exam_attempts ea
JOIN profiles p ON p.user_id = ea.user_id
JOIN courses c ON c.id = ea.course_id
ORDER BY ea.completed_at DESC
LIMIT 10;

-- Check certificates generated
SELECT 
  cert.id,
  cert.certificate_number,
  p.full_name,
  o.name as organization_name,
  c.title as course_title,
  cert.issue_date,
  cert.expiry_date,
  cert.tier_badge,
  cert.is_revoked,
  EXTRACT(DAY FROM (cert.expiry_date - NOW()))::INTEGER as days_until_expiry
FROM certificates cert
JOIN profiles p ON p.user_id = cert.user_id
LEFT JOIN organizations o ON o.id = p.organization_id
JOIN courses c ON c.id = cert.course_id
ORDER BY cert.created_at DESC
LIMIT 10;

-- Expected: Certificates for passed exams (score ≥ 80)

-- Verify certificate emails were sent
SELECT 
  el.id,
  el.recipient_email,
  el.email_type,
  el.status,
  el.sent_at,
  el.opened_at,
  el.clicked_at
FROM email_logs el
WHERE el.email_type = 'certificate-issued'
ORDER BY el.created_at DESC
LIMIT 10;

-- Public certificate verification
-- Visit: https://procannedu.com/verify-certificate?cert=<certificate_number>

-- ================================================================
-- GAP #9 VERIFICATION: Payment Flows
-- ================================================================

-- Check individual course payments
SELECT 
  p.id,
  p.user_id,
  u.email,
  c.title as course_title,
  p.amount,
  p.currency,
  p.status,
  p.payment_provider,
  p.created_at,
  p.completed_at
FROM payments p
JOIN auth.users u ON u.id = p.user_id
JOIN courses c ON c.id = p.course_id
ORDER BY p.created_at DESC
LIMIT 10;

-- Check bulk seat purchase orders
SELECT 
  o.id,
  o.user_id,
  u.email,
  o.organization_id,
  org.name as organization_name,
  o.quantity,
  o.total_amount,
  o.status,
  o.payment_provider,
  o.created_at,
  o.completed_at
FROM orders o
JOIN auth.users u ON u.id = o.user_id
LEFT JOIN organizations org ON org.id = o.organization_id
ORDER BY o.created_at DESC
LIMIT 10;

-- Verify seats were allocated after payment
SELECT 
  o.id as order_id,
  o.quantity as seats_purchased,
  COUNT(rs.id) as seats_allocated,
  o.status as order_status
FROM orders o
LEFT JOIN rvt_seats rs ON rs.order_id = o.id
WHERE o.status = 'completed'
GROUP BY o.id, o.quantity, o.status
HAVING COUNT(rs.id) != o.quantity;

-- Expected: Empty result (all completed orders should have matching seats)

-- ================================================================
-- POST-TEST: SYSTEM HEALTH CHECK
-- ================================================================

-- Overall pipeline conversion funnel
SELECT 
  'Applications Submitted' as stage,
  COUNT(*) as count
FROM dispensary_applications
UNION ALL
SELECT 
  'Applications Approved',
  COUNT(*)
FROM dispensary_applications
WHERE application_status = 'approved'
UNION ALL
SELECT 
  'Managers Registered',
  COUNT(*)
FROM user_roles
WHERE role = 'dispensary_manager'
UNION ALL
SELECT 
  'Employees Registered',
  COUNT(*)
FROM user_roles
WHERE role = 'student'
UNION ALL
SELECT 
  'Certificates Generated',
  COUNT(*)
FROM certificates
WHERE is_revoked = false
UNION ALL
SELECT 
  'Payments Completed',
  COUNT(*)
FROM (
  SELECT id FROM payments WHERE status = 'completed'
  UNION ALL
  SELECT id FROM orders WHERE status = 'completed'
) payments;

-- SLO Metrics (Service Level Objectives)
WITH email_metrics AS (
  SELECT 
    COUNT(*) as total_emails,
    COUNT(CASE WHEN status = 'sent' THEN 1 END) as successful,
    ROUND(100.0 * COUNT(CASE WHEN status = 'sent' THEN 1 END) / NULLIF(COUNT(*), 0), 2) as success_rate
  FROM email_logs
  WHERE created_at > NOW() - INTERVAL '24 hours'
),
seat_metrics AS (
  SELECT 
    SUM(course_credits) as total_purchased,
    COUNT(rs.id) as total_allocated,
    COUNT(CASE WHEN rs.status = 'available' THEN 1 END) as available,
    COUNT(CASE WHEN rs.assigned_user_id IS NULL AND rs.status != 'available' THEN 1 END) as orphaned
  FROM organizations o
  LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
  WHERE o.course_credits > 0
)
SELECT 
  'Email Success Rate' as metric,
  CONCAT(em.success_rate, '%') as value,
  CASE 
    WHEN em.success_rate >= 95 THEN '✅ Healthy'
    WHEN em.success_rate >= 85 THEN '⚠️ Warning'
    ELSE '❌ Critical'
  END as status
FROM email_metrics em
UNION ALL
SELECT 
  'Seat Allocation Integrity',
  CONCAT(sm.total_allocated, '/', sm.total_purchased, ' allocated') as value,
  CASE 
    WHEN sm.total_allocated >= sm.total_purchased AND sm.orphaned = 0 THEN '✅ Healthy'
    WHEN sm.orphaned = 0 THEN '⚠️ Warning'
    ELSE '❌ Critical'
  END as status
FROM seat_metrics sm;

-- Data Integrity Checks
SELECT 
  'Orphaned Certificates' as check_name,
  COUNT(*) as count,
  CASE WHEN COUNT(*) = 0 THEN '✅ Pass' ELSE '❌ Fail' END as status
FROM certificates c
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.user_id = c.user_id
)
UNION ALL
SELECT 
  'Orphaned Seats',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Pass' ELSE '❌ Fail' END
FROM rvt_seats rs
WHERE rs.status != 'available' 
  AND rs.assigned_user_id IS NULL
UNION ALL
SELECT 
  'Expired Registration Tokens',
  COUNT(*),
  CASE WHEN COUNT(*) = 0 THEN '✅ Pass' ELSE '⚠️ Warning' END
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
  AND registration_token_expires_at < NOW();

-- ================================================================
-- FINAL GO/NO-GO CHECKLIST
-- ================================================================

-- Run this final query to determine production readiness
WITH readiness_checks AS (
  SELECT 
    'Cron Jobs Running' as check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM cron_job_executions 
        WHERE executed_at > NOW() - INTERVAL '1 hour'
      ) THEN true 
      ELSE false 
    END as passed
  UNION ALL
  SELECT 
    'Email Circuit Closed',
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM email_circuit_breaker 
        WHERE circuit_state = 'closed'
      ) THEN true 
      ELSE false 
    END
  UNION ALL
  SELECT 
    'Email Acceptance Rate > 85%',
    CASE 
      WHEN (
        SELECT 
          100.0 * COUNT(CASE WHEN status = 'sent' THEN 1 END) / NULLIF(COUNT(*), 0)
        FROM email_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
      ) >= 85 THEN true 
      ELSE false 
    END
  UNION ALL
  SELECT 
    'Dead Letter Queue Empty',
    CASE 
      WHEN (
        SELECT COUNT(*) FROM notification_queue WHERE status = 'failed'
      ) = 0 THEN true 
      ELSE false 
    END
  UNION ALL
  SELECT 
    'No Expired Registration Tokens',
    CASE 
      WHEN (
        SELECT COUNT(*) 
        FROM dispensary_applications
        WHERE application_status = 'approved'
          AND registration_completed = false
          AND registration_token_expires_at < NOW()
      ) = 0 THEN true 
      ELSE false 
    END
  UNION ALL
  SELECT 
    'Seat Allocation Integrity',
    CASE 
      WHEN (
        SELECT COUNT(*) 
        FROM rvt_seats 
        WHERE status != 'available' AND assigned_user_id IS NULL
      ) = 0 THEN true 
      ELSE false 
    END
  UNION ALL
  SELECT 
    'At Least 1 Certificate Generated',
    CASE 
      WHEN EXISTS (SELECT 1 FROM certificates WHERE is_revoked = false) 
      THEN true 
      ELSE false 
    END
  UNION ALL
  SELECT 
    'PayPal Mode Configured',
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM admin_settings 
        WHERE setting_key = 'paypal_mode'
      ) THEN true 
      ELSE false 
    END
)
SELECT 
  check_name,
  CASE 
    WHEN passed THEN '✅ Pass' 
    ELSE '❌ Fail' 
  END as status,
  passed
FROM readiness_checks
ORDER BY passed ASC, check_name;

-- PRODUCTION GO/NO-GO DECISION:
-- All checks must pass (passed = true) for production launch
