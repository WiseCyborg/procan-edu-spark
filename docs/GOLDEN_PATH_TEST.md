# Golden Path End-to-End Test Script

This document provides step-by-step instructions for validating the complete production pipeline from dispensary application through certificate generation.

## Pre-Test Setup

### 1. Verify Foundation is Active

Run these SQL queries to confirm the system is ready:

```sql
-- Check cron jobs are active
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
-- Expected: 4 jobs (process-jobs, calculate-slo-metrics, cleanup-api-requests, queue-canary), all active = true

-- Check circuit breaker is healthy
SELECT circuit_state, failure_count FROM email_circuit_breaker;
-- Expected: circuit_state = 'closed', failure_count < 3

-- Check dead letter queue is empty
SELECT COUNT(*) as dlq_count FROM system_jobs_deadletter;
-- Expected: 0
```

## Test Sequence

### Stage 1: Dispensary Application → Approval

**Action:**
1. Navigate to Admin Dashboard → Dispensary Pipeline tab
2. Find a pending application (or create one at `/dispensary-application`)
3. Click "Approve" button
4. Enter credits (e.g., 10) and submit

**Verification SQL:**
```sql
-- Check approval job was queued and completed
SELECT 
  job_type, 
  status, 
  queued_at, 
  started_at, 
  completed_at,
  last_error
FROM system_jobs
WHERE job_type = 'send_approval_email'
ORDER BY queued_at DESC
LIMIT 5;

-- Expected: Status = 'completed', completed within 60 seconds of queuing

-- Check email was delivered
SELECT 
  recipient_email, 
  status, 
  provider, 
  created_at, 
  error_message
FROM email_logs
WHERE email_type = 'approval'
ORDER BY created_at DESC
LIMIT 3;

-- Expected: status IN ('sent', 'delivered')

-- Get the registration URL
SELECT 
  organization_name,
  contact_email,
  registration_token,
  'https://yourapp.com/manager-registration?token=' || registration_token as registration_url
FROM dispensary_applications
WHERE application_status = 'approved'
ORDER BY reviewed_at DESC
LIMIT 1;
```

**Success Criteria:**
- ✅ `send_approval_email` job status = 'completed' within 60s
- ✅ Email status = 'sent' or 'delivered'
- ✅ Registration token generated and not expired

---

### Stage 2: Manager Registration

**Action:**
1. Copy the `registration_url` from SQL above
2. Open in a new incognito window
3. Complete registration form:
   - Email (auto-filled)
   - Password
   - First Name
   - Last Name
   - Phone (optional)
4. Submit registration

**Verification SQL:**
```sql
-- Check manager profile created
SELECT 
  p.user_id,
  p.first_name,
  p.last_name,
  p.registration_completed,
  o.name as organization_name
FROM profiles p
JOIN organizations o ON o.id = p.organization_id
WHERE p.user_id = 'PASTE_USER_ID_HERE'
ORDER BY p.created_at DESC
LIMIT 1;

-- Expected: registration_completed = true

-- Check coordinator role assigned
SELECT ur.role
FROM user_roles ur
WHERE ur.user_id = 'PASTE_USER_ID_HERE';

-- Expected: role = 'training_coordinator'

-- Check welcome email sent
SELECT 
  job_type,
  status,
  completed_at
FROM system_jobs
WHERE job_type = 'send_welcome_email'
  AND payload->>'user_id' = 'PASTE_USER_ID_HERE'
ORDER BY queued_at DESC
LIMIT 1;

-- Expected: status = 'completed'
```

**Success Criteria:**
- ✅ Profile created with `registration_completed = true`
- ✅ Role = 'training_coordinator' assigned
- ✅ Welcome email job completed
- ✅ Can log in successfully

---

### Stage 3: Employee Invitation & Registration

**Action (as Manager/Coordinator):**
1. Log in as the manager created in Stage 2
2. Navigate to Team Management
3. Share the join code with test employees OR
4. Invite employees via email (use 2 test emails)

**Action (as Employee):**
1. Open registration at `/get-started`
2. Click "Join with Code"
3. Enter the join code from the organization
4. Complete registration form
5. Submit

**Verification SQL:**
```sql
-- Check join code is valid
SELECT 
  o.name,
  o.join_code,
  o.course_credits,
  COUNT(*) FILTER (WHERE s.status = 'available') as available_seats
FROM organizations o
LEFT JOIN rvt_seats s ON s.organization_id = o.id
WHERE o.join_code = 'PASTE_JOIN_CODE_HERE'
GROUP BY o.id, o.name, o.join_code, o.course_credits;

-- Expected: available_seats > 0

-- Check seat allocation after registration
SELECT 
  s.id as seat_id,
  s.status,
  s.assigned_user_id,
  p.first_name,
  p.last_name,
  p.email
FROM rvt_seats s
LEFT JOIN profiles p ON p.user_id = s.assigned_user_id
WHERE s.organization_id IN (
  SELECT id FROM organizations WHERE join_code = 'PASTE_JOIN_CODE_HERE'
)
ORDER BY s.created_at DESC
LIMIT 5;

-- Expected: 1 seat with status = 'assigned', assigned_user_id populated

-- Check student role assigned
SELECT 
  ur.role,
  p.first_name,
  p.last_name
FROM user_roles ur
JOIN profiles p ON p.user_id = ur.user_id
WHERE p.email = 'PASTE_EMPLOYEE_EMAIL_HERE';

-- Expected: role = 'student'

-- Verify seat allocation integrity
SELECT 
  o.name,
  o.course_credits as purchased,
  COUNT(*) FILTER (WHERE s.status = 'available') as available,
  COUNT(*) FILTER (WHERE s.status = 'assigned') as assigned,
  COUNT(*) FILTER (WHERE s.status = 'used') as used,
  o.course_credits - (
    COUNT(*) FILTER (WHERE s.status = 'available') +
    COUNT(*) FILTER (WHERE s.status = 'assigned') +
    COUNT(*) FILTER (WHERE s.status = 'used')
  ) as integrity_check
FROM organizations o
LEFT JOIN rvt_seats s ON s.organization_id = o.id
WHERE o.join_code = 'PASTE_JOIN_CODE_HERE'
GROUP BY o.id, o.name, o.course_credits;

-- Expected: integrity_check = 0 (all seats accounted for)
```

**Success Criteria:**
- ✅ Employee registers successfully
- ✅ Seat status changes from 'available' to 'assigned'
- ✅ `assigned_user_id` is populated
- ✅ Student role assigned
- ✅ Seat integrity maintained (sum of statuses = total credits)
- ✅ Welcome email sent

---

### Stage 4: Training Progress

**Action (as Student):**
1. Log in as the employee from Stage 3
2. Navigate to the course dashboard
3. Complete Module 1 (watch video, take quiz if applicable)
4. Complete Module 2
5. Verify tier badge unlocks (Green → Yellow after certain modules)

**Verification SQL:**
```sql
-- Check progress tracking
SELECT 
  user_id,
  course_id,
  modules_completed,
  current_tier,
  created_at,
  updated_at
FROM user_progress
WHERE user_id = 'PASTE_STUDENT_USER_ID_HERE'
ORDER BY updated_at DESC
LIMIT 1;

-- Expected: modules_completed >= 2

-- Check individual module completion
SELECT 
  module_id,
  completed,
  quiz_score,
  completed_at
FROM user_progress
WHERE user_id = 'PASTE_STUDENT_USER_ID_HERE'
ORDER BY completed_at DESC;

-- Expected: At least 2 rows with completed = true
```

**Success Criteria:**
- ✅ Modules save progress correctly
- ✅ `modules_completed` increments
- ✅ Tier progression works (if applicable)
- ✅ Quiz scores saved
- ✅ UI updates reflect database state

---

### Stage 5: Final Exam → Certificate

**Action (as Student):**
1. Complete all required modules (or use admin override for testing)
2. Navigate to Final Exam
3. Grant camera permission (or use bypass flag for testing)
4. Take the exam (ensure passing score, e.g., ≥ 80%)
5. Submit exam

**Verification SQL:**
```sql
-- Check exam attempt created
SELECT 
  id as exam_attempt_id,
  user_id,
  total_score,
  passing_score,
  is_passed,
  created_at,
  completed_at
FROM exam_attempts
WHERE user_id = 'PASTE_STUDENT_USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: is_passed = true, total_score >= passing_score

-- Check certificate generation job
SELECT 
  job_type,
  status,
  queued_at,
  completed_at,
  payload
FROM system_jobs
WHERE job_type = 'generate_certificate'
  AND payload->>'exam_attempt_id' = 'PASTE_EXAM_ATTEMPT_ID_HERE'
ORDER BY queued_at DESC
LIMIT 1;

-- Expected: status = 'completed' within 2 minutes

-- Check certificate record
SELECT 
  id,
  user_id,
  certificate_number,
  issue_date,
  expiry_date,
  pdf_url,
  is_revoked
FROM certificates
WHERE exam_attempt_id = 'PASTE_EXAM_ATTEMPT_ID_HERE';

-- Expected: pdf_url populated, is_revoked = false

-- Check certificate email sent
SELECT 
  job_type,
  status,
  completed_at
FROM system_jobs
WHERE job_type = 'send_certificate_email'
  AND payload->>'user_id' = 'PASTE_STUDENT_USER_ID_HERE'
ORDER BY queued_at DESC
LIMIT 1;

-- Expected: status = 'completed'

-- Verify certificate email delivery
SELECT 
  recipient_email,
  status,
  provider,
  delivered_at
FROM email_logs
WHERE email_type = 'certificate'
  AND user_id = 'PASTE_STUDENT_USER_ID_HERE'
ORDER BY created_at DESC
LIMIT 1;

-- Expected: status IN ('sent', 'delivered')
```

**Success Criteria:**
- ✅ Exam attempt recorded with `is_passed = true`
- ✅ `generate_certificate` job completes within 2 minutes
- ✅ Certificate record created with valid `pdf_url`
- ✅ Certificate is downloadable from UI
- ✅ `send_certificate_email` job completes
- ✅ Email delivered successfully
- ✅ Certificate number is unique and properly formatted

---

## Post-Test Verification

### System Health Check

```sql
-- Check overall queue health
SELECT * FROM v_queue_health ORDER BY job_type, status;

-- Check processor pulse
SELECT * FROM v_processor_pulse;

-- Check recent SLO metrics
SELECT 
  metric_name,
  metric_value,
  target_value,
  status,
  period_start,
  period_end
FROM slo_metrics
ORDER BY created_at DESC
LIMIT 8;

-- Expected: All SLOs status = 'healthy'

-- Email acceptance rate (last hour)
SELECT 
  (COUNT(*) FILTER (WHERE status IN ('sent','delivered'))::numeric / 
   NULLIF(COUNT(*),0))*100 AS acceptance_pct,
  COUNT(*) as total_emails
FROM email_logs
WHERE created_at > now() - interval '1 hour';

-- Expected: acceptance_pct >= 99%
```

### Data Integrity Checks

```sql
-- Seat allocation integrity across all orgs
SELECT 
  o.name,
  o.course_credits as purchased,
  COUNT(*) FILTER (WHERE s.status = 'available') as available,
  COUNT(*) FILTER (WHERE s.status = 'assigned') as assigned,
  COUNT(*) FILTER (WHERE s.status = 'used') as used,
  o.course_credits - (
    COUNT(*) FILTER (WHERE s.status = 'available') +
    COUNT(*) FILTER (WHERE s.status = 'assigned') +
    COUNT(*) FILTER (WHERE s.status = 'used')
  ) as discrepancy
FROM organizations o
LEFT JOIN rvt_seats s ON s.organization_id = o.id
WHERE o.admin_approved = true
GROUP BY o.id, o.name, o.course_credits
HAVING o.course_credits != (
  COUNT(*) FILTER (WHERE s.status = 'available') +
  COUNT(*) FILTER (WHERE s.status = 'assigned') +
  COUNT(*) FILTER (WHERE s.status = 'used')
);

-- Expected: 0 rows (no discrepancies)

-- No orphaned certificates
SELECT 
  c.id,
  c.user_id,
  ea.is_passed
FROM certificates c
LEFT JOIN exam_attempts ea ON ea.id = c.exam_attempt_id
WHERE ea.is_passed = false OR ea.id IS NULL;

-- Expected: 0 rows

-- No expired registration tokens still in use
SELECT 
  organization_name,
  contact_email,
  registration_token_expires_at,
  registration_completed
FROM dispensary_applications
WHERE registration_token_expires_at < now()
  AND registration_completed = false
  AND application_status = 'approved';

-- Expected: 0 rows (or acceptable number if grace period exists)
```

---

## Go/No-Go Final Checklist

Run this final checklist before declaring production-ready:

```sql
-- 1. Cron jobs are active
SELECT 'Cron Jobs' as check, 
       CASE WHEN COUNT(*) >= 4 AND bool_and(active) THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM cron.job;

-- 2. Queue is draining
SELECT 'Queue Draining' as check,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM system_jobs
WHERE status = 'queued' AND queued_at < now() - interval '5 minutes';

-- 3. Email acceptance rate
SELECT 'Email Acceptance' as check,
       CASE WHEN (COUNT(*) FILTER (WHERE status IN ('sent','delivered'))::numeric / 
                  NULLIF(COUNT(*),0))*100 >= 99 
            THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM email_logs
WHERE created_at > now() - interval '1 hour';

-- 4. Dead letter queue empty
SELECT 'DLQ Empty' as check,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM system_jobs_deadletter;

-- 5. Circuit breaker closed
SELECT 'Circuit Breaker' as check,
       CASE WHEN circuit_state = 'closed' THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM email_circuit_breaker;

-- 6. PayPal in sandbox
SELECT 'PayPal Sandbox' as check,
       CASE WHEN flag_value = true THEN '✅ PASS' ELSE '⚠️ WARNING' END as status
FROM feature_flags
WHERE flag_key = 'paypal_sandbox_mode';

-- 7. Seat integrity
SELECT 'Seat Integrity' as check,
       CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM organizations o
LEFT JOIN rvt_seats s ON s.organization_id = o.id
WHERE o.admin_approved = true
GROUP BY o.id, o.course_credits
HAVING o.course_credits != (
  COUNT(*) FILTER (WHERE s.status = 'available') +
  COUNT(*) FILTER (WHERE s.status = 'assigned') +
  COUNT(*) FILTER (WHERE s.status = 'used')
);

-- 8. SLO metrics healthy
SELECT 'SLO Metrics' as check,
       CASE WHEN bool_and(status = 'healthy') THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM slo_metrics
WHERE created_at > now() - interval '2 hours';
```

**Production Ready Criteria: ALL checks must show ✅ PASS (or ⚠️ WARNING for PayPal if intentionally in sandbox)**

---

## Troubleshooting

### Jobs not processing
```sql
-- Check if cron is calling jobs-processor
SELECT * FROM cron.job_run_details 
WHERE jobname = 'process-jobs' 
ORDER BY start_time DESC 
LIMIT 5;

-- Manual trigger
SELECT net.http_post(
  url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/jobs-processor',
  headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
  body:='{}'::jsonb
);
```

### Email circuit breaker open
```sql
-- Check status
SELECT * FROM email_circuit_breaker;

-- Force close (if provider issue resolved)
UPDATE email_circuit_breaker 
SET circuit_state = 'closed', failure_count = 0
WHERE circuit_state = 'open';
```

### Seat allocation mismatch
```sql
-- Find discrepancies
SELECT 
  o.name,
  o.course_credits,
  COUNT(*) as actual_seats
FROM organizations o
LEFT JOIN rvt_seats s ON s.organization_id = o.id
GROUP BY o.id, o.name, o.course_credits
HAVING COUNT(*) != o.course_credits;

-- Fix by regenerating seats (admin function)
-- Contact support or use admin panel "Regenerate Seats" button
```
