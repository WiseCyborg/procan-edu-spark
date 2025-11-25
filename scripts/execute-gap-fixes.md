# Gap Fix Execution Guide

**CRITICAL**: This is your step-by-step execution plan for Week 1 fixes before December 1st MCA launch.

---

## Prerequisites Verification

**Before executing any fixes, run these checks:**

```bash
# 1. Open Supabase SQL Editor
# 2. Copy and paste: scripts/verify-gap-fixes-prerequisites.sql
# 3. Run the entire script
# 4. Review results for any blockers
```

**Expected Prerequisites:**
- ✅ 7 expired registration tokens (to be regenerated)
- ✅ Demo Dispensary LLC with 50 credits, 0 seats (to be fixed)
- ✅ At least 1 active course exists
- ✅ Notification queue functional
- ✅ You are logged in as admin

---

## Phase 1: Execute Gap #2 & #4 Fixes

### Step 1: Navigate to Gap Analysis Page

1. **Login as Admin** at: `https://procannedu.com/login`
2. **Navigate to**: `https://procannedu.com/gap-analysis`
3. **Click Tab**: "Week 1 Fixes"

### Step 2: Execute Gap #2 Fix (Regenerate Tokens)

**UI Actions:**
1. Locate the "Gap #2: Regenerate Expired Registration Tokens" card
2. Click the **"Execute Gap #2 Fix"** button
3. Wait for success toast notification

**Backend Behavior:**
- Edge function: `batch-regenerate-tokens`
- Regenerates tokens for all 7 approved applications with expired tokens
- Sets new expiry to NOW() + 30 days
- Queues 7 approval emails via `notification_queue`

**Verification Query:**
```sql
-- Should return 0 rows (no expired tokens)
SELECT 
  id,
  organization_name,
  contact_email,
  registration_token_expires_at,
  EXTRACT(DAY FROM (NOW() - registration_token_expires_at))::INTEGER as days_expired
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = false
  AND registration_token_expires_at < NOW();
```

**Expected Result:**
- 0 expired tokens
- 7 new tokens with expiry ~30 days from now
- 7 emails queued in `notification_queue` with `email_type = 'application-approved'`

---

### Step 3: Execute Gap #4 Fix (Fix Seat Mismatch)

**UI Actions:**
1. Locate the "Gap #4: Fix Seat Allocation Mismatch" card
2. Click the **"Execute Gap #4 Fix"** button
3. Wait for success toast notification

**Backend Behavior:**
- Edge function: `reconcile-seats`
- Creates 50 seats for Demo Dispensary LLC
- All seats created with status='available'
- Links to first active course found

**Verification Query:**
```sql
-- Should show Demo Dispensary with 50 allocated seats
SELECT 
  o.name,
  o.course_credits as purchased_seats,
  COUNT(rs.id) as allocated_seats,
  COUNT(CASE WHEN rs.status = 'available' THEN 1 END) as available_seats
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
WHERE o.name = 'Demo Dispensary LLC'
GROUP BY o.id, o.name, o.course_credits;
```

**Expected Result:**
- 50 purchased seats
- 50 allocated seats
- 50 available seats
- 0 assigned or used seats (employees haven't registered yet)

---

### Step 4: Verify Fixes Applied Successfully

**Run Full Verification Suite:**
```bash
# In Supabase SQL Editor, run:
# scripts/pipeline-validation-test-suite.sql
# Sections: "GAP #2 VERIFICATION" and "GAP #4 VERIFICATION"
```

**Go/No-Go Decision Point:**
- ✅ **GO**: Both fixes show expected results → Proceed to Phase 2
- ❌ **NO-GO**: Fixes failed → See Troubleshooting section below

---

## Phase 2: Test Manager Registration (Gap #3)

### Step 1: Get Registration URL

**Query to Get URL:**
```sql
SELECT 
  id,
  organization_name,
  contact_email,
  contact_person,
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
```

**Copy the `registration_url` value.**

---

### Step 2: Complete Manager Registration

**Manual Testing:**
1. Open **incognito/private browser window**
2. Navigate to the `registration_url` from above
3. Fill out manager registration form:
   - **Full Name**: Test Manager
   - **Phone**: (123) 456-7890
   - **Password**: MeetS3cur1ty!
   - **Confirm Password**: MeetS3cur1ty!
4. Click **"Complete Registration"**
5. Wait for redirect to dashboard

**Expected Behavior:**
- Form validation passes
- Account created successfully
- Redirect to manager dashboard
- Welcome email sent

---

### Step 3: Verify Manager Created

**Verification Query:**
```sql
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
LIMIT 1;
```

**Expected Result:**
- New row with `role = 'dispensary_manager'`
- `organization_id` matches dispensary from application
- `full_name` populated

---

### Step 4: Verify Application Marked Complete

**Verification Query:**
```sql
SELECT 
  id,
  organization_name,
  registration_completed,
  organization_id,
  updated_at
FROM dispensary_applications
WHERE application_status = 'approved'
  AND registration_completed = true
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected Result:**
- `registration_completed = true`
- `organization_id` populated
- `updated_at` reflects recent timestamp

---

## Phase 3: Test 4-Step Manager Onboarding (Gap #6)

### Step 1: Login as Manager

**Login:**
1. Navigate to: `https://procannedu.com/login`
2. Email: (from registration above)
3. Password: MeetS3cur1ty!
4. Click **"Sign In"**

---

### Step 2: Walk Through Onboarding Wizard

**Expected Flow:**

**Step 1: Welcome**
- Greeting: "Welcome, [Manager Name]!"
- Organization name displayed
- Click **"Next"**

**Step 2: Organization Snapshot**
- Organization details displayed:
  - Name
  - Address
  - Phone
  - License Number
- Click **"Next"**

**Step 3: Seat Overview**
- Shows seat allocation:
  - **Purchased**: 50
  - **Available**: 50
  - **Assigned**: 0
- Click **"Next"**

**Step 4: Invite Employees**
- Form to send employee invitations
- Role selection: Student
- Enter test employee:
  - **Name**: Test Employee
  - **Email**: test.employee@example.com
  - **Role**: Student
- Click **"Send Invitation"**
- Click **"Finish"** when done

**Exit State:**
- Success message displayed
- CTAs: "View Employee Progress" and "Copy Join Code"

---

### Step 3: Verify Invitation Created

**Verification Query:**
```sql
SELECT 
  si.id,
  si.organization_id,
  o.name as organization_name,
  si.invitee_email,
  si.invitee_name,
  si.role,
  si.status,
  si.created_at,
  si.expires_at,
  CONCAT(
    'https://procannedu.com/register?invitation=',
    si.invitation_token
  ) as registration_url
FROM staff_invitations si
JOIN organizations o ON o.id = si.organization_id
ORDER BY si.created_at DESC
LIMIT 1;
```

**Expected Result:**
- New invitation with `status = 'pending'`
- `invitee_email = 'test.employee@example.com'`
- `expires_at` ~7 days from now
- `registration_url` to use for employee registration

---

## Phase 4: Test Employee Registration (Gap #7)

### Step 1: Get Invitation Link

**Use `registration_url` from Phase 3 verification query above.**

---

### Step 2: Complete Employee Registration

**Manual Testing:**
1. Open **new incognito/private browser window**
2. Navigate to the `registration_url` from above
3. Fill out employee registration form:
   - **Full Name**: Test Employee
   - **Phone**: (234) 567-8901
   - **Password**: Stud3nt!Pass
   - **Confirm Password**: Stud3nt!Pass
4. Click **"Complete Registration"**
5. Wait for redirect to student dashboard

**Expected Behavior:**
- Form validation passes
- Seat atomically allocated
- Account created successfully
- Redirect to student dashboard
- Welcome email sent

---

### Step 3: Verify Employee Created with Seat

**Verification Query:**
```sql
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
  c.title as course_title
FROM auth.users u
JOIN profiles p ON p.user_id = u.id
JOIN user_roles ur ON ur.user_id = u.id
LEFT JOIN organizations o ON o.id = p.organization_id
LEFT JOIN rvt_seats rs ON rs.assigned_user_id = u.id
LEFT JOIN courses c ON c.id = rs.course_id
WHERE ur.role = 'student'
ORDER BY u.created_at DESC
LIMIT 1;
```

**Expected Result:**
- New user with `role = 'student'`
- `seat_status = 'assigned'` or `'used'`
- `seat_id` present (not NULL)
- `course_title` populated

---

### Step 4: Verify Seat Allocation Integrity

**Verification Query:**
```sql
-- Should return 0 orphaned seats
SELECT 
  COUNT(*) as orphaned_seats
FROM rvt_seats
WHERE status != 'available' 
  AND assigned_user_id IS NULL;
```

**Expected Result:**
- `orphaned_seats = 0`

---

### Step 5: Verify Invitation Marked Accepted

**Verification Query:**
```sql
SELECT 
  id,
  invitee_email,
  status,
  accepted_at,
  accepted_by_user_id
FROM staff_invitations
WHERE status = 'accepted'
ORDER BY accepted_at DESC
LIMIT 1;
```

**Expected Result:**
- `status = 'accepted'`
- `accepted_at` timestamp present
- `accepted_by_user_id` matches new user

---

## Phase 5: Validate Email System (Gap #5)

### Step 1: Check Emails Sent

**Verification Query:**
```sql
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
```

**Expected Email Types:**
- `application-submitted`
- `application-approved`
- `manager-welcome`
- `employee-invitation`

**Expected Success Rate:**
- ≥ 85% (ideally ≥ 95%)

---

### Step 2: Check Email Provider Health

**Verification Query:**
```sql
SELECT 
  provider_name,
  status,
  last_check_at,
  last_success_at,
  error_count,
  response_time_ms
FROM email_provider_health
ORDER BY last_check_at DESC;
```

**Expected Result:**
- Resend: `status = 'healthy'`
- Low `error_count` (< 10)
- Recent `last_success_at`

---

### Step 3: Check Circuit Breaker Status

**Verification Query:**
```sql
SELECT 
  circuit_state,
  failure_count,
  last_failure_at
FROM email_circuit_breaker
ORDER BY updated_at DESC
LIMIT 1;
```

**Expected Result:**
- `circuit_state = 'closed'`
- Low `failure_count` (< 5)

---

## Phase 6: Certificate Generation (Gap #8)

**NOTE**: This phase requires completing 18 course modules and passing the final exam. This is a time-intensive process and may be tested in Week 2.

### Quick Test Path (If Modules Exist):

1. **Login as student** (from Phase 4)
2. **Navigate to**: Course Dashboard
3. **Complete all 18 modules** (or use test account with completed modules)
4. **Take final exam**
5. **Score ≥ 80%** to pass

---

### Verify Certificate Generated

**Verification Query:**
```sql
SELECT 
  cert.id,
  cert.certificate_number,
  p.full_name,
  o.name as organization_name,
  c.title as course_title,
  cert.issue_date,
  cert.expiry_date,
  cert.tier_badge
FROM certificates cert
JOIN profiles p ON p.user_id = cert.user_id
LEFT JOIN organizations o ON o.id = p.organization_id
JOIN courses c ON c.id = cert.course_id
ORDER BY cert.created_at DESC
LIMIT 1;
```

**Expected Result:**
- New certificate row
- `certificate_number` format: `RVT-2024-XXXXXX`
- `tier_badge` reflects student's tier
- `expiry_date` ~1 year from `issue_date`

---

### Verify Certificate Email Sent

**Verification Query:**
```sql
SELECT 
  el.recipient_email,
  el.email_type,
  el.status,
  el.sent_at
FROM email_logs el
WHERE el.email_type = 'certificate-issued'
ORDER BY el.created_at DESC
LIMIT 1;
```

**Expected Result:**
- Email sent to student
- `status = 'sent'`

---

### Test Public Certificate Verification

**Manual Test:**
1. Copy `certificate_number` from query above
2. Navigate to: `https://procannedu.com/verify-certificate?cert=<certificate_number>`
3. Verify certificate details displayed:
   - Student name
   - Organization name
   - Issue date
   - Expiration date
   - Green "Valid" badge

---

## Phase 7: Payment Flows (Gap #9)

**NOTE**: Payment testing requires PayPal sandbox configuration. This may be tested in Week 2.

### Test Individual Course Payment

1. **Login as unauthenticated user** (or create new account)
2. **Navigate to**: Course catalog
3. **Select course** → "Purchase Course"
4. **Complete PayPal checkout** (sandbox)
5. **Verify payment recorded**

**Verification Query:**
```sql
SELECT 
  p.id,
  u.email,
  c.title as course_title,
  p.amount,
  p.status,
  p.completed_at
FROM payments p
JOIN auth.users u ON u.id = p.user_id
JOIN courses c ON c.id = p.course_id
ORDER BY p.created_at DESC
LIMIT 1;
```

---

### Test Bulk Seat Purchase

1. **Login as dispensary manager**
2. **Navigate to**: Organization Settings → Purchase Seats
3. **Enter quantity**: 10
4. **Complete PayPal checkout** (sandbox)
5. **Verify seats allocated**

**Verification Query:**
```sql
SELECT 
  o.id as order_id,
  o.quantity as seats_purchased,
  COUNT(rs.id) as seats_allocated,
  o.status
FROM orders o
LEFT JOIN rvt_seats rs ON rs.order_id = o.id
WHERE o.status = 'completed'
GROUP BY o.id, o.quantity, o.status
ORDER BY o.created_at DESC
LIMIT 1;
```

**Expected Result:**
- `seats_purchased = seats_allocated`

---

## Final Go/No-Go Checklist

**Run this query to determine production readiness:**

```sql
-- Copy from scripts/pipeline-validation-test-suite.sql
-- Section: "FINAL GO/NO-GO CHECKLIST"
```

**Production Launch Criteria:**
- ✅ All checks must pass (`passed = true`)
- ✅ No critical failures
- ✅ Email acceptance rate ≥ 85%
- ✅ Seat allocation integrity maintained
- ✅ At least 1 end-to-end certificate generated

---

## Troubleshooting

### Gap #2 Fix Failed (Tokens Not Regenerated)

**Symptoms:**
- Still see expired tokens after clicking "Execute"
- Edge function returns error
- No new emails queued

**Diagnosis:**
```sql
-- Check edge function logs
SELECT * FROM edge_function_status 
WHERE function_name = 'batch-regenerate-tokens'
ORDER BY last_check DESC LIMIT 1;

-- Check if function was invoked
SELECT * FROM supabase_functions.logs 
WHERE function_name = 'batch-regenerate-tokens'
ORDER BY timestamp DESC LIMIT 10;
```

**Fixes:**
1. **Verify you're logged in as admin**
2. **Check edge function deployed**: `supabase functions list`
3. **Manually regenerate tokens via SQL**:
```sql
-- Emergency manual fix
UPDATE dispensary_applications
SET 
  registration_token = gen_random_uuid()::text,
  registration_token_expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE application_status = 'approved'
  AND registration_completed = false
  AND registration_token_expires_at < NOW()
RETURNING id, organization_name, registration_token_expires_at;
```

---

### Gap #4 Fix Failed (Seats Not Created)

**Symptoms:**
- Demo Dispensary still shows 0 seats
- Edge function returns error
- Seat count unchanged

**Diagnosis:**
```sql
-- Check if active course exists
SELECT id, title, is_active 
FROM courses 
WHERE is_active = true 
LIMIT 1;
```

**Fixes:**
1. **Verify active course exists** (if not, activate a course)
2. **Manually create seats via SQL**:
```sql
-- Emergency manual fix
WITH target_org AS (
  SELECT id, course_credits 
  FROM organizations 
  WHERE name = 'Demo Dispensary LLC'
),
active_course AS (
  SELECT id FROM courses WHERE is_active = true LIMIT 1
)
INSERT INTO rvt_seats (
  organization_id,
  course_id,
  status,
  created_at
)
SELECT 
  target_org.id,
  active_course.id,
  'available',
  NOW()
FROM 
  target_org,
  active_course,
  generate_series(1, (SELECT course_credits FROM target_org))
RETURNING id, organization_id, status;
```

---

### Manager Registration Failed

**Symptoms:**
- Form validation errors
- "Invalid token" error
- Account not created

**Diagnosis:**
```sql
-- Check token validity
SELECT 
  id,
  organization_name,
  registration_token,
  registration_token_expires_at,
  registration_completed
FROM dispensary_applications
WHERE registration_token = '<token_from_url>';
```

**Common Issues:**
1. **Token expired**: Re-run Gap #2 fix
2. **Token already used**: `registration_completed = true`
3. **Email already exists**: User account already created

---

### Employee Registration Failed

**Symptoms:**
- "No seats available" error
- Form validation errors
- Seat not allocated

**Diagnosis:**
```sql
-- Check available seats
SELECT 
  COUNT(*) as available_seats
FROM rvt_seats rs
JOIN staff_invitations si ON si.organization_id = rs.organization_id
WHERE si.invitation_token = '<token_from_url>'
  AND rs.status = 'available';
```

**Common Issues:**
1. **No seats available**: Re-run Gap #4 fix or purchase more seats
2. **Invitation expired**: Manager must resend invitation
3. **Invitation already accepted**: Account already created

---

### Email Not Sending

**Symptoms:**
- No emails in inbox
- `status = 'failed'` in `email_logs`
- Circuit breaker open

**Diagnosis:**
```sql
-- Check circuit breaker
SELECT circuit_state, failure_count, last_failure_at
FROM email_circuit_breaker
ORDER BY updated_at DESC LIMIT 1;

-- Check recent failures
SELECT email_type, error_message, created_at
FROM email_logs
WHERE status = 'failed'
ORDER BY created_at DESC LIMIT 10;
```

**Fixes:**
1. **Verify Resend domain**: https://resend.com/domains
2. **Check API key**: Environment variable `RESEND_API_KEY`
3. **Reset circuit breaker**:
```sql
UPDATE email_circuit_breaker
SET 
  circuit_state = 'closed',
  failure_count = 0,
  opened_at = NULL,
  updated_at = NOW()
WHERE id = (SELECT id FROM email_circuit_breaker ORDER BY updated_at DESC LIMIT 1);
```

---

## Support Escalation

If issues persist after troubleshooting:

1. **Capture error logs**: Screenshots, SQL results, edge function logs
2. **Document steps taken**: What you tried, what failed
3. **Check Supabase dashboard**: Logs, Auth, Database
4. **Review edge function logs**: Errors, timeouts, payloads
5. **Escalate with context**: Provide all diagnostic info

---

## Next Steps After Successful Validation

Once all gaps are validated:

1. **Week 2 (Nov 23-29)**:
   - Complete certificate generation testing
   - Validate payment flows end-to-end
   - Test email deliverability at scale

2. **Week 3 (Nov 30-Dec 1)**:
   - Polish UI/UX
   - Mobile testing
   - Demo rehearsal
   - Production launch prep

3. **Launch Day (Dec 1)**:
   - Final smoke tests
   - Monitor real-time metrics
   - Be ready for support escalation

---

## Success Metrics

**Pipeline Health Indicators:**
- ✅ 100% token regeneration success
- ✅ 100% seat allocation accuracy
- ✅ ≥ 95% email delivery rate
- ✅ 0 orphaned seats or certificates
- ✅ ≥ 1 end-to-end certificate generated
- ✅ ≥ 1 successful payment transaction

**Launch Readiness Score:**
- 🟢 **GREEN (Go)**: All metrics met
- 🟡 **YELLOW (Caution)**: 1-2 metrics below target
- 🔴 **RED (No-Go)**: 3+ metrics failing or critical blocker

---

**END OF EXECUTION GUIDE**
