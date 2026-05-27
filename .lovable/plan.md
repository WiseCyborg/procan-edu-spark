# Automate Post-Migration E2E Regression

Goal: every time a Supabase migration is applied, the E2E validation suite runs twice automatically and a fresh readiness report is generated — no manual button clicks.

## Architecture

```text
migration applied
   │
   ▼
pg trigger on supabase_migrations.schema_migrations (AFTER INSERT)
   │  (pg_net.http_post)
   ▼
edge fn: post-migration-regression  (verify_jwt=false, HMAC-signed)
   │  1. invoke run-e2e-validation  (run #1)
   │  2. invoke run-e2e-validation  (run #2, determinism check)
   │  3. call security--equivalent: supabase linter + cached scan
   │  4. compose markdown report
   │  5. write to storage bucket  regression-reports/<migration_version>.md
   │  6. insert row in  regression_runs  table
   ▼
admin UI: /admin/regression  (new tab in OperationsCommandCenter)
   │  • lists regression_runs (latest first)
   │  • shows pass/fail, both run hashes, signed link to report
   │  • "Re-run" button → manual trigger of same edge fn
```

## Deliverables

### 1. Database (Migration)
- New table `public.regression_runs`
  - `migration_version text`, `triggered_by text` (`auto|manual`), `run1_summary jsonb`, `run2_summary jsonb`, `deterministic boolean`, `verdict text` (`SHIPPABLE|BLOCKED|DEGRADED`), `report_path text`, `duration_ms int`, `error text`
  - Standard `id`, `created_at`
  - RLS: admin-only SELECT via `has_role(auth.uid(),'admin')`; service_role ALL
  - GRANTs per public-schema rules
- New storage bucket `regression-reports` (private); admin SELECT, service_role ALL
- Trigger function `public.trigger_post_migration_regression()` on `supabase_migrations.schema_migrations` AFTER INSERT
  - Uses `pg_net.http_post` to call edge fn with HMAC header (`REGRESSION_HMAC_SECRET`) and migration version in body
  - Debounce: skip if a row exists in `regression_runs` for the same `migration_version` within the last 60s (prevents storm on batched migrations)

### 2. Edge Function `post-migration-regression`
- `verify_jwt = false` (called by pg_net, no user JWT)
- Validates `x-regression-signature` HMAC against `REGRESSION_HMAC_SECRET` — rejects unsigned calls
- Steps:
  1. Insert `regression_runs` row (status=running)
  2. Invoke `run-e2e-validation` twice sequentially, capture full JSON
  3. Compute deterministic flag (same pass/fail composition)
  4. Query `supabase--linter` equivalent via REST (or call internal `pg_security_lint` view we already have)
  5. Render markdown report (executive verdict, both runs, security posture, caveats) — reuse template from `PRE_PROD_READINESS_REPORT.md`
  6. Upload to `regression-reports/<version>__<timestamp>.md`
  7. Update row with verdict, summaries, report_path
- Verdict rules: `SHIPPABLE` only if both runs 100% pass AND deterministic AND no new ERROR-level linter findings; `DEGRADED` if non-blocking regressions; `BLOCKED` if any fail

### 3. Secret
- `REGRESSION_HMAC_SECRET` — generated and stored via secrets tool before edge fn is deployed

### 4. Admin UI
- New file `src/components/admin/operations/RegressionTab.tsx`
- Add as tab in `OperationsCommandCenter.tsx` next to existing Testing tab
- Table: timestamp, migration version, trigger source, run1/run2 status badges, deterministic ✓/✗, verdict badge, report link (signed URL via `supabase.storage.from('regression-reports').createSignedUrl(path, 3600)`), "Re-run" button
- "Re-run on latest migration" button at top → invokes edge fn with `triggered_by=manual`

### 5. Docs
- Append "Automated Post-Migration Regression" section to `docs/OPERATIONS_RUNBOOK.md` describing trigger, where to find reports, how to disable (toggle row in `feature_flags`)
- Feature flag `auto_regression_enabled` (default `true`) — trigger fn checks it before firing

## Out of Scope
- No changes to `run-e2e-validation` logic itself (it's already idempotent post B-1 fix)
- No email/Slack notification (can be added later by subscribing to `regression_runs` realtime)
- No CI/GitHub Actions integration (DB-trigger model keeps it inside Supabase)
- No changes to existing security migrations A/B/C

## Risk & Mitigation
- **Trigger storm on bulk migrations**: 60s debounce + feature flag kill switch
- **Edge fn timeout** (two E2E runs ~3–4 min total, within 400s limit): runs sequential not parallel to keep DB load predictable; if timeout becomes an issue, split into queue worker
- **HMAC secret leak**: signature validates body+timestamp; rotate via secrets tool
- **Report bucket bloat**: storage lifecycle rule to delete reports >90 days (added in same migration)

## Approval Needed
Confirm and I'll: create the secret, run the migration, deploy the edge fn, build the admin tab, and trigger one dry-run against the most recent migration to verify the loop end-to-end.
