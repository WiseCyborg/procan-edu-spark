## End-to-End Test Run Plan

Execute the existing E2E pipeline regression harness against the live preview to confirm the platform is ready for Danielle and Louis's UAT session (including the just-shipped Vimeo fallback).

### What gets run

1. **`post-migration-regression` edge function** — full pipeline sweep:
   - Auth + session bootstrap
   - Org membership / seat allocation → entitlement trigger
   - Course gating + module completion persistence
   - Exam atomic init + proxy photo check-in
   - Certificate issuance + verification portal lookup
   - Stripe webhook idempotency replay (test mode)
   - Access snapshot RPC consistency
2. **`get-video-url` smoke** against `welcome-intro` (Vimeo fallback) and one MP4 asset (signed URL) — confirms today's change didn't regress either branch.
3. **PipelineTestHarness UI run** at `/admin` → Operations → Testing tab, captured via browser preview, so we have a visible green/red board for the call.
4. **UAT harness scenarios** (`useUATRun`) — run the standard matrix (apply → approve → seat → train → exam → cert) for one consumer and one org-seated user.

### Output

- Pass/fail table written to `docs/audit/2026-07/evidence/e2e_run_2026-06-16.md`
- Edge function log excerpts for any failure
- Screenshot of the Testing tab final state
- One-line go/no-go verdict appended to `docs/audit/2026-07/PRE_CALL_SIGNOFF_2026-06-14.md`

### Out of scope

- No schema changes, no data repairs, no new features
- No Vimeo → Storage migration work
- No destructive prod actions; webhook replay uses Stripe test mode only

### Technical notes

- Harness already exists: `supabase/functions/post-migration-regression`, `src/components/admin/PipelineTestHarness.tsx`, `src/hooks/useUATRun.ts`
- Runs against the current Supabase project; uses seeded UAT accounts (`docs/testing/uat-password-standard`)
- Total wall time ≈ 3–5 min

Approve and I'll execute.
