# ProCann Edu Launch Readiness Audit Pack

Deliverable: a single `docs/LAUNCH_READINESS_AUDIT_2026-07.md` index plus per-domain evidence files in `docs/audit/2026-07/`, ready for Levels to verify against production by June 27.

## Table name mapping (their doc → our schema)

| Audit doc name | Real table(s) |
|---|---|
| `users` | `auth.users` + `profiles` + `profiles_private` |
| `enrollments` | `course_entitlements`, `consumer_enrollments`, `rvt_seats` |
| `payments` | `payments`, `orders`, `payment_events`, `payment_audit_log` |
| `user_profiles` | `profiles`, `profiles_private` |
| `quiz_results` | `exam_attempts`, `exam_topic_scores`, `user_progress` |
| `video_progress` | `user_progress`, `course_resume_state` |
| `comar_compliance_records` | `module_attestations`, `module_compliance_reviews`, `certificates`, `user_certificates`, `comar_versions` |
| `audit_log` | `admin_operations_audit`, `security_audit_log`, `certificate_audit_log`, `payment_audit_log`, `user_operation_logs`, `user_activity_log`, unified audit timeline view |

This mapping is documented up front so Levels can reconcile terminology.

## Deliverables

```text
docs/
  LAUNCH_READINESS_AUDIT_2026-07.md       ← index + exec summary + sign-off block
  audit/2026-07/
    00_TABLE_NAME_MAPPING.md
    01_AUTH_AND_RLS.md                    ← Domain 1
    02_PAYMENT_INTEGRITY.md               ← Domain 2
    03_EMAIL_VERIFICATION.md              ← Domain 3
    04_VIDEO_ACCESS_CONTROL.md            ← Domain 4
    05_DATA_GOVERNANCE.md                 ← Domain 5
    evidence/
      rls_policies_dump.sql               ← pg_policies for the 7 sensitive tables
      rls_negative_tests.md               ← curl/SQL transcripts as student A vs B, anon, instructor
      stripe_webhook_flow.md              ← state machine + idempotency proof
      stripe_webhook_replay.log           ← duplicate-delivery test transcript
      email_verification_flow.md          ← token lifetime, Resend config, SPF/DKIM/DMARC status
      signed_video_url_tests.md           ← cross-student + expiry transcripts
      data_governance_checklist.md        ← 7-section checklist with pass/fail + queries
      pii_scan_queries.sql                ← scans for plaintext passwords / PAN / SSN
```

## Per-domain content

**Domain 1 — Auth & RLS.** Dump `pg_policies` for the 7 tables above; describe the policy posture (owner-scoped, org-scoped, has_role-gated); run the 6 negative tests via `supabase--curl_edge_functions` and `read_query` impersonating a student JWT; document `auth.uid()` and `has_role()` enforcement.

**Domain 2 — Payment integrity.** Inline the Stripe webhook handler (`supabase/functions/stripe-webhook*`), draw the `orders` → `payments` → `course_entitlements` state machine, prove idempotency by replaying a Stripe event ID twice and showing only one entitlement row, prove unique-constraint protection against duplicate enrollments, show malformed-payload rejection.

**Domain 3 — Email verification.** Document `email_verification_codes` schema + TTL, the verification edge function, Resend domain status, current "Domain Not Verified" warning root cause + fix, deliverability test to Gmail/Outlook/ProtonMail.

**Domain 4 — Video access.** Inline `get-video-url` edge function + `useSignedVideoUrl` hook; document signing method (Supabase Storage signed URL), TTL, enrollment check via `course_entitlements`; run cross-student and expiry tests; confirm deployment status.

**Domain 5 — Data governance.** Run `pii_scan_queries.sql` against the live DB (no PAN/CVV anywhere, only Stripe `pm_*`/`pi_*` tokens; `auth.users.encrypted_password` bcrypt-only; PII columns in `profiles_private` encrypted via pgcrypto); document the unified audit timeline view; document backup posture (Supabase PITR); confirm immutability of `module_attestations` and `certificate_audit_log` via RLS (no UPDATE/DELETE policies).

## Approach

1. Read-only DB exploration via `supabase--read_query` and `supabase--linter` — no schema changes.
2. Code reads of the relevant edge functions and hooks.
3. Live test transcripts captured via `supabase--curl_edge_functions` with student-vs-student JWTs.
4. Pure documentation writes — no app code changes, no migrations.

## Out of scope

- No code or schema changes. If the audit surfaces a gap (e.g., missing RLS, missing unique constraint, missing token TTL), it is logged in the relevant domain doc as a **Finding** with severity + recommended fix, and tracked separately — not silently patched inside this audit pack.
- No Stripe / Resend account changes.
- No production data exports.

## Open questions before I start writing

1. **Findings handling:** if I uncover a real gap during the audit (e.g., a missing RLS policy or an unprotected column), do you want me to (a) document only and stop, (b) document + open a follow-up plan, or (c) document + fix in the same pass?
2. **Test student accounts:** should I use existing UAT accounts (`uat_accounts` table) for the cross-student RLS/video tests, or create dedicated `test_student_001@…` / `test_student_002@…` accounts as the doc literally requests?
3. **Resend "Domain Not Verified" warning:** is this currently visible in your Resend dashboard right now? If yes, I'll include a screenshot ask + concrete DNS diff; if no, I'll mark it resolved with the date.
