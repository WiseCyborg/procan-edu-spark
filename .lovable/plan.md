# Automate Post-Migration E2E Regression — No New Secret Required

Replaces the HMAC-based plan. Same outcome (E2E runs twice + report generated after each migration) but uses primitives already in the project.

## Why change paths
The original plan required a new `REGRESSION_HMAC_SECRET`, which added a manual setup step. This revised plan piggybacks on the existing `SUPABASE_SERVICE_ROLE_KEY` (already present as both an edge-function env var and accessible to `pg_net` via Supabase Vault), so zero new secrets are needed.

## Revised architecture

```text
migration applied (any source: CLI, dashboard, Lovable tool)
   │
   ▼
pg_cron job: 'regression-watcher' (every 1 min)
   │  • SELECT max(version) FROM supabase_migrations.schema_migrations
   │  • Compare to public.regression_runs.migration_version last row
   │  • If new → enqueue
   ▼
pg_net.http_post → edge fn  post-migration-regression
   │  Authorization: Bearer <service_role_key from vault>
   │
   ▼
edge fn (verify_jwt=false)
   • Validates Authorization header equals Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
   • Runs run-e2e-validation twice
   • Computes deterministic flag + verdict
   • Renders markdown report → uploads to storage bucket
   • Updates regression_runs row
```

Two reasons cron-watcher beats AFTER-INSERT trigger:
1. `supabase_migrations.schema_migrations` is a Supabase-managed table — adding triggers to it is fragile and may be blocked.
2. Cron gives free debouncing (one check per minute) and survives missed events.

## Deliverables

### 1. Migration
- Table `public.regression_runs` (same shape as before: `migration_version`, `triggered_by`, `run1_summary jsonb`, `run2_summary jsonb`, `deterministic bool`, `verdict text`, `report_path text`, `duration_ms int`, `status text`, `error text`)
- RLS: admin SELECT via `has_role(auth.uid(),'admin')`; service_role ALL. Full GRANT block per project rules.
- Storage bucket `regression-reports` (private). Policies: admin SELECT, service_role ALL.
- Feature-flag row in existing `feature_flags` table: `auto_regression_enabled` default `true`.
- Function `public.enqueue_regression_if_new()` — `SECURITY DEFINER`, reads latest migration version, compares to latest `regression_runs`, fires `pg_net.http_post` to edge fn with service-role bearer pulled from `vault.decrypted_secrets` (key `service_role_key`). Skips if flag off or run already in progress.
- Vault secret `service_role_key`: stored via one-line SQL the user runs once in SQL Editor (`select vault.create_secret(...)`). Provided in chat for copy-paste — never committed to migration history.
- `pg_cron` schedule: every 1 minute, runs `enqueue_regression_if_new()`.

### 2. Edge function `post-migration-regression`
- `verify_jwt = false`, called by `pg_net` and from the admin UI's "Re-run" button (which calls it via `supabase.functions.invoke` with the user's session — function accepts EITHER service-role bearer OR an admin JWT validated via `has_role`).
- Body: `{ migration_version, triggered_by }`.
- Flow: insert `regression_runs` row (status=`running`) → invoke `run-e2e-validation` twice sequentially → diff results for determinism → render markdown report → upload to bucket → update row.
- Verdict rules: `SHIPPABLE` if both 100% pass + deterministic; `DEGRADED` if non-blocking failures; `BLOCKED` otherwise.

### 3. Admin UI
- `src/components/admin/operations/RegressionTab.tsx` — new tab in `OperationsCommandCenter`.
- Lists `regression_runs` newest-first with badges (verdict, deterministic), signed link to report, and `Re-run on latest migration` button.
- Realtime subscription on `regression_runs` so a running row updates live.

### 4. Docs
- Append "Automated Post-Migration Regression" section to `docs/OPERATIONS_RUNBOOK.md` (how it works, how to pause via feature flag, where to find reports).
- One-time vault setup snippet included.

## What user does manually
**One time only**, paste this in Supabase SQL Editor (so the trigger can call edge functions without exposing the SRK in any committed file):

```sql
select vault.create_secret(
  '<paste SUPABASE_SERVICE_ROLE_KEY from project settings>',
  'service_role_key',
  'Used by regression-watcher cron to invoke post-migration-regression edge fn'
);
```

That's it. After that, every applied migration is followed within ~60s by the automated regression run + report.

## Out of scope
- No changes to `run-e2e-validation` itself.
- No email/Slack notifications (can subscribe to `regression_runs` realtime later).
- No CI integration — pure in-Supabase loop.

## Risk & mitigation
- **Cron drift / missed migrations**: watcher compares max versions so it always catches up.
- **Concurrent runs**: insert uses advisory lock; if a `running` row exists, skip.
- **Edge fn timeout**: two sequential E2E runs ~3–4 min, within 400s limit.
- **Storage growth**: cleanup job deletes reports older than 90 days.

Approve and I'll execute end-to-end with no further prompts beyond the one-time vault SQL.
