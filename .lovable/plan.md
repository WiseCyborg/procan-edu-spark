# Pre-Production Remediation — Team Brief

Goal: close every blocker found in the readiness audit so Danielle and Louis can run UAT against a stable, secure platform. Each item below has WHAT, WHY, WHERE, OWNER, ESTIMATE, and DONE-WHEN so any engineer can pick it up.

---

## P0 — Must complete before handoff

### 1. B-1: E2E entitlement cleanup (test harness)
- WHAT: Add an idempotent delete of the test user's prior `course_entitlements` row before the first insert in the H3/H4 step.
- WHY: Re-running the suite leaves residue from the prior run and trips `course_entitlements_source_check` / unique constraint on the next run. Causes a false Tier-1 blocker.
- WHERE: `supabase/functions/run-e2e-validation/index.ts`, H3/H4 entitlement block.
- DONE-WHEN: Two back-to-back runs of `run-e2e-validation` both report 49/49 pass.
- ESTIMATE: 5 min.

### 2. S-1 / S-2 / S-3 / S-7: Public read on sensitive tables
- WHAT: Replace `TO public USING (true)` policies with `TO service_role` (and where needed, scoped `authenticated` policies) on:
  - `email_verification_codes`
  - `staff_invitations`
  - `exam_attempts`
  - `chat_intent_log`
- WHY: Anyone with the anon key can currently read verification codes (account takeover), invitations (phishing), exam answers (cheating), and chat logs (PII leak).
- WHERE: Single Supabase migration; drop existing permissive policies, recreate scoped ones, ensure GRANTs match.
- DONE-WHEN: `security--get_scan_results` shows S-1, S-2, S-3, S-7 cleared; affected flows (signup verification, invite acceptance, exam start, chat) still work end-to-end in E2E run.
- ESTIMATE: 20 min.

### 3. S-4 / S-5 / S-11: Public certificate + join-code verification
- WHAT: Lock down `user_certificates`, `consumer_certificates`, `rvt_join_codes` to `service_role` and expose verification via a `SECURITY DEFINER` RPC (or existing public edge function) that returns only the minimum verification fields.
- WHY: Public verification is a real product requirement, but the current implementation exposes full rows including PII. The fix preserves the verification UX without leaking data.
- WHERE: Migration + small edge function / RPC update; update `SecureCertificateVerification.tsx` to call the new RPC.
- DONE-WHEN: Public cert verification page still resolves a known cert; direct anon `select *` on the tables returns 0 rows; scan clears S-4, S-5, S-11.
- ESTIMATE: 30 min.

### 4. S-6 / S-8 / S-9 / S-10: Remaining RLS gaps
- WHAT: Tighten policies on:
  - `consumer_enrollments` — scope to `auth.uid() = user_id`
  - `covered_sessions` — scope to participants / org members
  - `realtime.messages` — restrict broadcast/presence to authenticated channels
  - `call-recordings` storage bucket — upload limited to session participants; read limited to org admins + participant
- WHY: Cross-tenant data leakage and unauthenticated writes to storage.
- WHERE: One migration for the three tables; storage policies via migration on `storage.objects`.
- DONE-WHEN: Scan clears S-6, S-8, S-9, S-10; covered-session and consumer-course flows still pass in E2E.
- ESTIMATE: 30 min total.

### 5. Re-run E2E suite + capture clean report
- WHAT: Invoke `run-e2e-validation` twice, attach both result payloads to the readiness report, and update `/mnt/documents/PRE_PROD_READINESS_REPORT.md` with the green status.
- DONE-WHEN: Two consecutive runs show 49/49 pass and the report is regenerated with "SHIPPABLE" verdict.
- ESTIMATE: 5 min.

### 6. Confirm Danielle's login
- WHAT: Trigger password reset for `daniellebrooks502@gmail.com` (or rerun the setup function), confirm membership in ABC org with manager role, and document join code `DISP-2025-F7271DE9`.
- WHY: Louis is already provisioned; Danielle's credentials have not been verified in this round.
- DONE-WHEN: Manual login succeeds in preview; access snapshot shows correct role.
- ESTIMATE: 5 min.

### 7. Handoff packet
- WHAT: Produce `/mnt/documents/UAT_HANDOFF_LOUIS_DANIELLE.md` containing:
  - Login URLs (preview + production)
  - Credentials for both accounts
  - Test checklist mapped to journeys (apply → approve → invite → train → exam → cert)
  - Known-acceptable warnings (e.g., `pg_net` in public, Postgres upgrade pending)
  - Bug-report template (URL, steps, expected, actual, screenshot, browser)
  - Slack/email channel for issue intake
- DONE-WHEN: File exists, linked as `presentation-artifact`.
- ESTIMATE: 15 min.

---

## P1 — Can ship to UAT with caveats, fix during UAT window

### 8. Linter ERROR: 3 Security Definer Views
- WHAT: Recreate the 3 flagged views with `WITH (security_invoker = true)` so they execute under the caller's RLS context.
- WHY: Currently bypass RLS; not externally exploitable in current surface but violates best practice and could regress under future schema changes.
- ESTIMATE: 15 min.

### 9. Postgres major-version upgrade
- WHAT: Schedule via Supabase dashboard during a low-traffic window; follow `docs/SECURITY_FIX_IMPLEMENTATION.md` Phase 3 checklist.
- WHY: Picks up CVE patches; not blocking UAT.
- ESTIMATE: 1–2 hr (5–10 min downtime).

---

## P2 — Defer past UAT

- ~550 linter warnings: `Function Search Path Mutable`, `Authenticated Security Definer Function Executable`, `Public GraphQL Schema Exposure`, `RLS Policy Always True` audits. Address in a dedicated hardening sprint after UAT signal.

---

## Sequencing

```text
1. B-1 E2E fix
2. Migration A: S-1/S-2/S-3/S-7
3. Migration B: S-4/S-5/S-11 (+ verification RPC + frontend swap)
4. Migration C: S-6/S-8/S-9/S-10 (+ storage policies)
5. Re-run E2E x2, regenerate report
6. Verify Danielle login
7. Publish handoff packet
8. (Parallel) Schedule Postgres upgrade + security-definer view fix
```

## What this plan does NOT change

- No business logic, UI copy, or pricing changes.
- No edits to admin dashboards, course content, or AI agent code.
- No production data writes outside the E2E test user.

## Technical notes

- All migrations follow the standard 4-step pattern (CREATE/ALTER → GRANT → ENABLE RLS → POLICY) per project memory.
- `service_role` is the only role that should retain blanket access on the locked-down tables; edge functions already use the service role key server-side.
- Public verification flows (certs, join codes) must continue to work for anonymous users — that is why they move to `SECURITY DEFINER` RPCs rather than just being closed off.
- E2E harness must remain idempotent; any new test inserts should follow the same delete-before-insert pattern added in B-1.
