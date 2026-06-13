# 00 — Table Name Mapping

The audit handover doc uses generic names. ProCann's real schema is broader. This is the canonical mapping used in every Domain doc.

| Audit doc name | Real table(s) | Notes |
|---|---|---|
| `users` | `auth.users` (Supabase-managed) + `public.profiles` + `public.profiles_private` | Passwords in `auth.users.encrypted_password` (bcrypt). PII split into `profiles_private` and pgcrypto-encrypted. |
| `enrollments` | `public.course_entitlements` (primary), `public.consumer_enrollments`, `public.rvt_seats` | Course access is enforced by `course_entitlements (user_id, course_id) UNIQUE`. |
| `payments` | `public.payments`, `public.orders`, `public.payment_events`, `public.payment_audit_log` | `orders.stripe_session_id UNIQUE`. `payments.transaction_id UNIQUE` (idempotency). |
| `user_profiles` | `public.profiles`, `public.profiles_private` | Profile public vs. PII. |
| `quiz_results` | `public.exam_attempts`, `public.exam_topic_scores`, `public.user_progress` | Exam attempts + per-topic scoring + module progress. |
| `video_progress` | `public.user_progress`, `public.course_resume_state` | Resume state is DB-backed (see memory: per-course-resume-persistence). |
| `comar_compliance_records` | `public.module_attestations`, `public.module_compliance_reviews`, `public.certificates`, `public.user_certificates`, `public.comar_versions` | Module attestations are append-only (no UPDATE/DELETE policy). |
| `audit_log` | `public.admin_operations_audit`, `public.security_audit_log`, `public.certificate_audit_log`, `public.payment_audit_log`, `public.user_operation_logs`, `public.user_activity_log` | Aggregated by the unified audit timeline view. |

## Processor mapping

| Audit doc name | Real provider in production |
|---|---|
| Stripe (course payments) | **PayPal** via `create-course-payment-paypal` + `verify-payment-paypal` + `paypal-webhook` |
| Stripe (dispensary applications) | **Stripe** via `create-dispensary-payment` + `verify-dispensary-payment` |
| Resend (transactional email) | Resend via `_shared/email-router.ts` (reply_to → `info@procannedu.com`) |
