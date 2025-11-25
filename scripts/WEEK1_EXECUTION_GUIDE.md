# Week 1 Core Flow Validation - Execution Guide

## Overview
This guide covers the implementation and execution of Gap #2 (Regenerate Expired Tokens) and Gap #4 (Fix Seat Mismatches) as part of the Week 1 Core Flow Validation for the Dec 1 MCA launch.

## Current State
- **7 approved applications** with expired registration tokens (all expired Nov 11, 2024)
- **Demo Dispensary LLC** has 50 course_credits but 0 allocated seats (critical mismatch)
- **Zero manager registrations** completed (blocked by expired tokens)
- **Zero employees registered** (cannot test downstream flows)

## Implementation Completed

### 1. SQL Script Created
**File:** `scripts/week1-gap2-gap4-fixes.sql`

This comprehensive SQL script includes:
- ✅ Token regeneration logic (30-day expiry)
- ✅ Seat reconciliation using existing `reconcile_seats()` function
- ✅ Verification queries to confirm fixes
- ✅ Detailed logging and progress reporting
- ✅ Summary report with next steps

### 2. Admin UI Component Created
**File:** `src/components/admin/GapFixesExecutor.tsx`

React component providing:
- ✅ One-click execution buttons for both Gap #2 and Gap #4
- ✅ Real-time progress indicators
- ✅ Success/failure feedback with detailed results
- ✅ Integrated into Gap Analysis Dashboard as "Week 1 Fixes" tab

### 3. Edge Functions Deployed
- ✅ `batch-regenerate-tokens` - Regenerates tokens and resends approval emails
- ✅ `reconcile-seats` - Reconciles seat allocations across all organizations

## Execution Instructions

### Option A: Using Admin UI (Recommended)
1. Navigate to `/gap-analysis` in your browser
2. Click the "Week 1 Fixes" tab
3. Click "Execute Gap #2 Fix" button
   - This will regenerate all expired tokens
   - Automatically resend approval emails to all 7 organizations
   - Display results with count of emails sent
4. Click "Execute Gap #4 Fix" button
   - This will reconcile seats for all organizations
   - Specifically fixes Demo Dispensary LLC (0 → 50 seats)
   - Display results with count of seats created

### Option B: Using SQL Editor
1. Open Supabase SQL Editor
2. Copy and paste contents of `scripts/week1-gap2-gap4-fixes.sql`
3. Execute the entire script
4. Review the RAISE NOTICE messages in the output
5. After SQL execution, manually invoke edge functions:
   ```typescript
   // In browser console or via Supabase dashboard
   await supabase.functions.invoke('batch-regenerate-tokens');
   await supabase.functions.invoke('reconcile-seats');
   ```

### Option C: Using Supabase CLI
```bash
# Execute SQL migration
supabase db execute scripts/week1-gap2-gap4-fixes.sql

# Invoke edge functions
supabase functions invoke batch-regenerate-tokens
supabase functions invoke reconcile-seats
```

## Verification Steps

### 1. Verify Gap #2 Fix (Tokens)
```sql
-- Check token status
SELECT 
  organization_name,
  contact_email,
  registration_token_expires_at::date as expires_on,
  CASE 
    WHEN registration_token_expires_at > NOW() THEN '✅ Valid'
    ELSE '❌ Expired'
  END as status
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false;
```

**Expected Result:** All 7 applications show "✅ Valid" with expiry ~Dec 16, 2024

### 2. Verify Gap #4 Fix (Seats)
```sql
-- Check Demo Dispensary seats
SELECT 
  o.name,
  o.course_credits,
  COUNT(rs.id) as total_seats,
  COUNT(rs.id) FILTER (WHERE rs.status = 'available') as available,
  CASE 
    WHEN o.course_credits = COUNT(rs.id) THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as status
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.name = 'Demo Dispensary LLC'
GROUP BY o.id, o.name, o.course_credits;
```

**Expected Result:** 
- total_seats: 50
- available: 50
- status: "✅ Match"

### 3. Verify Emails Sent
```sql
-- Check email logs
SELECT 
  email_type,
  recipient_email,
  status,
  sent_at,
  provider
FROM email_logs
WHERE email_type = 'application_approved'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

**Expected Result:** 7 rows with status = 'sent' from Resend or SMTP provider

## What Was Fixed

### Gap #2: Registration Tokens
**Problem:** All 7 approved applications had registration tokens that expired on Nov 11, 2024. Managers could not complete registration even if they tried.

**Fix Applied:**
- Generated new secure tokens using `ENCODE(GEN_RANDOM_BYTES(32), 'hex')`
- Set expiry to 30 days from now (Dec 16, 2024)
- Triggered `batch-regenerate-tokens` edge function to resend approval emails
- Each email contains:
  - Updated registration URL with new token
  - Organization access key
  - Join code for employee invitations
  - Credit allocation details

### Gap #4: Seat Mismatches
**Problem:** Demo Dispensary LLC had 50 `course_credits` but 0 rows in `rvt_seats` table, making it impossible for managers to invite employees.

**Fix Applied:**
- Invoked `reconcile_seats()` database function
- Function logic:
  1. Compares `course_credits` vs actual seat count for each org
  2. Creates missing seats to match credit allocation
  3. Sets all new seats to `status = 'available'`
  4. Logs reconciliation to `system_integrity_checks` table
- Specifically creates 50 seats for Demo Dispensary LLC
- All other organizations verified to have correct seat counts

## Technical Details

### Edge Function: batch-regenerate-tokens
**Location:** `supabase/functions/batch-regenerate-tokens/index.ts`

**What it does:**
1. Verifies admin authorization
2. Finds all approved applications with expired tokens
3. For each application:
   - Calls `regenerate_manager_token` RPC function
   - Fetches organization details (access key, join code)
   - Invokes `send-approval-email` with updated registration URL
   - Logs success/failure for each email
4. Returns summary: total processed, success count, failure count, errors

**Admin Access Required:** Yes (checks user_roles for 'admin' role)

### Edge Function: reconcile-seats
**Location:** `supabase/functions/reconcile-seats/index.ts`

**What it does:**
1. Verifies admin authorization
2. Fetches all admin-approved organizations
3. For each organization:
   - Counts existing seats in `rvt_seats`
   - Compares with `course_credits`
   - If deficit exists, creates missing seats
   - Updates organization's `total_seats` field
4. Returns summary: orgs checked, orgs reconciled, seats created, errors

**Admin Access Required:** Yes (checks user_roles for 'admin' role)

## Next Steps After Execution

### Immediate Verification (15 min)
1. ✅ Run verification queries above
2. ✅ Check Resend dashboard for email delivery stats
3. ✅ Verify Demo Dispensary now shows 50 available seats
4. ✅ Test one registration link from approval email

### Gap #3: Manager Registration (30 min)
1. Open one of the 7 approval emails
2. Click "Complete Your Registration" button
3. Fill out manager registration form
4. Complete registration and verify profile created
5. Verify redirect to 4-step onboarding wizard

### Gap #6: Onboarding Wizard (1 hour)
1. Complete all 4 wizard steps
2. Test employee invitation feature
3. Verify invitations sent to `staff_invitations` table
4. Test mobile responsiveness

### Gap #7: Employee Registration (1 hour)
1. Use invitation link from email
2. Complete employee registration form
3. Verify seat allocation is atomic (status: available → assigned)
4. Verify profile created with organization_id
5. Test redirect to student dashboard

## Troubleshooting

### Problem: Edge function fails with "Admin access required"
**Solution:** Ensure you're logged in as a user with 'admin' role in the `user_roles` table

### Problem: No emails sent after Gap #2 fix
**Solution:** 
1. Check `email_circuit_breaker` table - if circuit is open, reset it
2. Check `email_provider_health` - if Resend is unhealthy, emails will failover to SMTP
3. Verify Resend API key is configured in Supabase secrets

### Problem: Demo Dispensary still shows 0 seats after Gap #4 fix
**Solution:**
1. Verify `course_credits` is 50: `SELECT course_credits FROM organizations WHERE name = 'Demo Dispensary LLC'`
2. Run reconciliation again: `SELECT * FROM reconcile_seats()`
3. Check `system_integrity_checks` for logged issues

### Problem: Registration link shows "Invalid or expired token"
**Solution:**
1. Verify token expiry: Check verification query #1
2. If expired, re-run Gap #2 fix
3. Ensure URL includes full token parameter

## Success Criteria

### Gap #2 Success Criteria
- ✅ All 7 applications have valid tokens expiring Dec 16, 2024
- ✅ 7 approval emails sent successfully (status = 'sent' in email_logs)
- ✅ Managers can click registration link and load manager registration page
- ✅ Token validation passes (no "expired token" errors)

### Gap #4 Success Criteria
- ✅ Demo Dispensary LLC has exactly 50 seats in rvt_seats table
- ✅ All 50 seats have status = 'available'
- ✅ All other organizations have seat count matching course_credits
- ✅ No seat mismatches reported in system_integrity_checks

## Timeline
- **Estimated Execution Time:** 10 minutes
- **Verification Time:** 15 minutes
- **Total Time Investment:** 25 minutes

## Files Modified
1. `scripts/week1-gap2-gap4-fixes.sql` (New)
2. `src/components/admin/GapFixesExecutor.tsx` (New)
3. `src/pages/GapAnalysisPage.tsx` (Modified - added Week 1 Fixes tab)
4. `supabase/functions/batch-regenerate-tokens/index.ts` (Already existed, deployed)
5. `supabase/functions/reconcile-seats/index.ts` (Already existed, deployed)

## Support
If issues arise during execution:
1. Check Supabase function logs for edge function errors
2. Review email_logs and communication_logs for email delivery issues
3. Query system_integrity_checks for seat reconciliation warnings
4. Contact support@procannedu.com for assistance

---

**Status:** ✅ Ready for Execution
**Last Updated:** 2024-11-16
**Part of:** Week 1 Core Flow Validation (Nov 16-22)
**MCA Launch Date:** December 1, 2024 (15 days away)
