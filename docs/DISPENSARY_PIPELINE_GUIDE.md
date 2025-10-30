# 🏥 Dispensary Pipeline Guide

## Complete End-to-End Flow

This guide documents the complete journey from dispensary application to employee certification.

---

## 📋 Pipeline Overview

```
Application → Approval → Payment → Organization Setup → Manager Registration → 
Employee Invitation → Course Enrollment → Training Completion → Certificate Generation
```

---

## 🔄 Detailed Pipeline Steps

### Step 1: Application Submission

**User Action:** Dispensary owner fills out application form
**File:** `src/pages/DispensaryApplication.tsx`
**Database:** `dispensary_applications` table
**Edge Function:** `send-application-confirmation/index.ts`

**What Happens:**
1. Form validates all required fields (org name, license, contact info)
2. Application inserted into `dispensary_applications` table
3. Status set to `'pending'`
4. Confirmation email sent to applicant

**Common Issues:**
- ❌ **Network error on submission**
  - Check: Edge function `send-application-confirmation` is deployed
  - Check: Database RLS policy allows public inserts
  - Fix: Verify `supabase functions list` shows function

- ❌ **Email not received**
  - Check: `email_logs` table for delivery status
  - Check: Email provider health (`email_provider_health` table)
  - Fix: Test email provider via `test-email-providers` function

**Testing:**
```sql
-- Check recent applications
SELECT id, organization_name, application_status, created_at
FROM dispensary_applications
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

---

### Step 2: Admin Approval

**User Action:** Admin reviews and approves application
**File:** `src/components/admin/DispensaryApplicationManager.tsx`
**Edge Function:** `notify-application-status/index.ts` or `send-approval-email/index.ts`

**What Happens:**
1. Admin reviews application details
2. Updates `application_status` to `'approved'`
3. Approval email sent with:
   - Unique dispensary number
   - Payment instructions
   - Access credentials

**Common Issues:**
- ❌ **Approval email not sent**
  - Check: Email function logs
  - Check: `email_logs` table
  - Fix: Verify `notify-application-status` function is deployed

- ⚠️ **Pending applications piling up**
  - Check: Admin dashboard for notification count
  - Fix: Set up automated approval reminders

**Testing:**
```sql
-- Approve test application
UPDATE dispensary_applications
SET application_status = 'approved',
    reviewed_by = (SELECT id FROM profiles WHERE email = 'admin@procannedu.com' LIMIT 1),
    reviewed_at = NOW()
WHERE id = 'your-app-id';
```

---

### Step 3: Payment Processing

**User Action:** Manager completes PayPal payment
**Files:** `create-dispensary-payment/index.ts`, `verify-dispensary-payment/index.ts`
**Database:** `orders` table

**What Happens:**
1. PayPal checkout created with seat quantity
2. User redirected to PayPal
3. Payment webhook received
4. Order status updated to `'completed'`
5. Organization record created
6. Seats allocated to organization

**Common Issues:**
- ❌ **Payment stuck in "pending"**
  - Check: PayPal webhook configuration
  - Check: `orders` table status
  - Fix: Manually verify via PayPal dashboard, then update order status

- ❌ **Organization not created after payment**
  - Check: `verify-dispensary-payment` function logs
  - Check: Database constraints on `organizations` table
  - Fix: Verify payment ID matches order, manually create org if needed

**Testing:**
```sql
-- Check payment status
SELECT o.id, o.status, o.payment_provider_order_id, da.organization_name
FROM orders o
JOIN dispensary_applications da ON da.id = o.metadata->>'application_id'
WHERE o.created_at >= NOW() - INTERVAL '7 days'
ORDER BY o.created_at DESC;
```

---

### Step 4: Manager Registration

**User Action:** Manager creates account using access key from approval email
**File:** `src/pages/ManagerRegistration.tsx`
**Database:** `profiles`, `user_roles`, `dispensary_applications.registration_completed`

**What Happens:**
1. Manager signs up with email/password
2. Access key validated against `dispensary_applications.registration_token`
3. Profile created with `organization_id`
4. User role set to `'dispensary_manager'`
5. `registration_completed` set to `true`
6. Welcome email sent

**Common Issues:**
- ❌ **Invalid access key**
  - Check: `dispensary_applications.registration_token` matches
  - Check: Token hasn't expired (`registration_token_expires_at`)
  - Fix: Generate new token via admin panel

- ❌ **Profile not linked to organization**
  - Check: `profiles.organization_id` is set
  - Check: `user_roles` table has `dispensary_manager` entry
  - Fix: Manually update profile with correct `organization_id`

**Testing:**
```sql
-- Check manager registration status
SELECT da.organization_name, da.registration_completed, p.email, ur.role
FROM dispensary_applications da
LEFT JOIN profiles p ON p.email = da.contact_email
LEFT JOIN user_roles ur ON ur.user_id = p.user_id
WHERE da.application_status = 'approved'
ORDER BY da.created_at DESC;
```

---

### Step 5: Manager Onboarding & Team Setup

**User Action:** Manager completes onboarding wizard and invites employees
**File:** `src/components/onboarding/ManagerOnboarding.tsx`
**Edge Function:** `send-employee-invitation/index.ts`

**What Happens:**
1. Manager completes profile information
2. Views available seats (`rvt_seats` table)
3. Invites employees by email
4. Invitation emails sent with unique registration links
5. Seats reserved for invited employees

**Common Issues:**
- ❌ **No seats available**
  - Check: `rvt_seats` table for organization
  - Check: Payment was processed correctly
  - Fix: Manually allocate seats via `allocate-seats-on-payment` function

- ❌ **Invitation emails not sent**
  - Check: `communication_logs` table
  - Check: Email provider status
  - Fix: Resend invitation via manager dashboard

**Testing:**
```sql
-- Check seat allocation
SELECT o.name, COUNT(rs.id) as total_seats, 
       COUNT(rs.id) FILTER (WHERE rs.assigned_user_id IS NULL) as available_seats
FROM organizations o
LEFT JOIN rvt_seats rs ON rs.organization_id = o.id
GROUP BY o.id, o.name;
```

---

### Step 6: Employee Enrollment

**User Action:** Employee clicks invitation link and creates account
**File:** `src/pages/AcceptInvitation.tsx`
**Edge Function:** `accept-invitation/index.ts`

**What Happens:**
1. Employee clicks unique invitation link
2. Creates account with email/password
3. Seat assigned to employee (`rvt_seats.assigned_user_id`)
4. Profile created with `organization_id`
5. User role set to `'student'`
6. Course access granted

**Common Issues:**
- ❌ **Invitation link expired**
  - Check: `communication_logs.created_at` (7-day expiration)
  - Fix: Manager resends invitation

- ❌ **Seat not assigned after signup**
  - Check: `rvt_seats` table for assigned user
  - Check: `profiles.organization_id` matches
  - Fix: Manually assign seat via admin panel

**Testing:**
```sql
-- Check employee enrollment
SELECT p.email, p.organization_id, ur.role, rs.id as seat_id
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id
LEFT JOIN rvt_seats rs ON rs.assigned_user_id = p.user_id
WHERE ur.role = 'student' AND p.organization_id IS NOT NULL
ORDER BY p.created_at DESC;
```

---

### Step 7: Course Access & Training

**User Action:** Employee accesses course modules and completes training
**Files:** `src/pages/Course/CourseModule.tsx`, `src/pages/Course/FinalExam.tsx`

**What Happens:**
1. Employee accesses 18 course modules
2. Progresses through green → yellow → red tiers
3. Completes quizzes in each module
4. Takes final exam
5. Must score ≥80% to pass

**Common Issues:**
- ❌ **Course not accessible after enrollment**
  - Check: `rvt_seats` table shows assigned seat
  - Check: `orders` table shows completed payment
  - Fix: Verify RLS policies on `course_modules`

- ⚠️ **Progress not saving**
  - Check: `user_progress` table
  - Check: Browser console for errors
  - Fix: Verify database permissions

**Testing:**
```sql
-- Check course progress
SELECT p.email, up.course_id, up.module_number, up.completed
FROM user_progress up
JOIN profiles p ON p.user_id = up.user_id
WHERE up.updated_at >= NOW() - INTERVAL '7 days'
ORDER BY up.updated_at DESC;
```

---

### Step 8: Certificate Generation

**User Action:** Employee passes final exam
**Files:** `generate-certificate/index.ts`, `send-certificate-email/index.ts`
**Database:** `certificates`, `exam_attempts`

**What Happens:**
1. Exam attempt recorded with score
2. If score ≥80%:
   - Certificate generated with unique number
   - PDF created and stored
   - Email sent with certificate attachment
   - QR code for verification generated

**Common Issues:**
- ❌ **Certificate not generated after passing**
  - Check: `exam_attempts` table for passing score
  - Check: `certificates` table for record
  - Check: Edge function logs for `generate-certificate`
  - Fix: Manually trigger certificate generation

- ❌ **Certificate email not received**
  - Check: `email_logs` table
  - Check: `certificates.pdf_url` is set
  - Fix: Resend via `send-certificate-email` function

**Testing:**
```sql
-- Check certificate generation
SELECT c.certificate_number, c.created_at, ea.total_score, p.email
FROM certificates c
JOIN exam_attempts ea ON ea.id = c.exam_attempt_id
JOIN profiles p ON p.user_id = c.user_id
WHERE c.created_at >= NOW() - INTERVAL '7 days'
ORDER BY c.created_at DESC;
```

---

## 🔍 Pipeline Health Monitoring

### Key Metrics to Track

1. **Conversion Rate per Stage**
   - Applications → Approvals: Should be >80%
   - Approvals → Payments: Should be >90%
   - Payments → Registrations: Should be >95%
   - Invitations → Enrollments: Should be >70%
   - Enrollments → Certificates: Should be >60%

2. **Time to Complete**
   - Application → Approval: <48 hours
   - Approval → Payment: <7 days
   - Payment → Registration: <24 hours
   - Invitation → Enrollment: <7 days
   - Enrollment → Certificate: <30 days

3. **Drop-off Points**
   - High drop-off at payment: Payment friction
   - High drop-off at registration: Email deliverability issue
   - High drop-off at enrollment: Invitation email issue
   - High drop-off at completion: Course difficulty or time commitment

### Automated Health Checks

**Edge Function:** `test-dispensary-pipeline/index.ts`

Run via admin dashboard to test:
- Database connectivity
- Application submission
- Email delivery
- Organization creation
- Seat allocation

---

## 🛠️ Troubleshooting Checklist

### Before investigating:
1. ✅ Check `SystemHealthDashboard` for overall system health
2. ✅ Review `DispensaryPipelineMonitor` for conversion rates
3. ✅ Check `email_logs` table for email delivery issues
4. ✅ Verify edge functions are deployed: `supabase functions list`

### Step-by-step diagnosis:
1. Identify which stage has the issue
2. Check relevant database tables
3. Review edge function logs
4. Test edge function directly via admin panel
5. Check RLS policies if data not visible
6. Verify email templates if email not received

---

## 📊 SQL Queries for Pipeline Monitoring

```sql
-- Complete pipeline overview (last 30 days)
WITH pipeline_metrics AS (
  SELECT 
    COUNT(*) as total_applications,
    COUNT(*) FILTER (WHERE application_status = 'approved') as approved,
    COUNT(*) FILTER (WHERE registration_completed = true) as registered
  FROM dispensary_applications
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
org_metrics AS (
  SELECT COUNT(*) as organizations_created
  FROM organizations
  WHERE created_at >= NOW() - INTERVAL '30 days'
),
employee_metrics AS (
  SELECT 
    COUNT(*) FILTER (WHERE role = 'student' AND organization_id IS NOT NULL) as employees_enrolled
  FROM profiles p
  JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.created_at >= NOW() - INTERVAL '30 days'
),
cert_metrics AS (
  SELECT COUNT(*) as certificates_issued
  FROM certificates
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT * FROM pipeline_metrics, org_metrics, employee_metrics, cert_metrics;
```

---

## 🚨 Common Error Messages & Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "upstream connect error" | Edge function not deployed or network issue | Deploy function via `supabase functions deploy` |
| "Application submission failed" | Database constraint or RLS policy | Check console logs for specific error code |
| "Invalid access key" | Token expired or incorrect | Generate new token in admin panel |
| "No seats available" | Payment not processed or seats not allocated | Check `orders` and `rvt_seats` tables |
| "Certificate generation failed" | Exam attempt not recorded or score too low | Verify `exam_attempts` table has passing score |

---

## 📞 Support Escalation Path

1. **Level 1:** Check this guide and SystemHealthDashboard
2. **Level 2:** Run automated pipeline test
3. **Level 3:** Review edge function logs and database tables
4. **Level 4:** Contact dev team with specific error details

---

## 🎯 Pipeline Success Criteria

✅ **Healthy Pipeline:**
- All edge functions respond within 2 seconds
- Email delivery rate >95%
- Payment success rate >98%
- Certificate generation rate 100% for passing exams
- No manual intervention required for happy path

⚠️ **Needs Attention:**
- Any stage conversion rate <70%
- Email delivery rate <90%
- Payment failures >5%
- Manual interventions required

🔴 **Critical Issues:**
- Any edge function returning 500 errors
- Email delivery completely failing
- Payment processing broken
- Certificate generation failing

---

Last Updated: 2025-10-29
