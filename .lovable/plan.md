# COMAR Scraper Deploy — 5 Items

Five-item deploy to wire the regulatory scrapers to a daily cycle with alerting and admin visibility. Schema-adapted to existing `regulatory_updates` and `cron_job_executions` tables (no migration).

## 1. Adapt `trigger-scrapers/index.ts`

Rewrite the orchestrator with:

- **runId** (uuid) generated per invocation, included in every log row and the response.
- **Per-scraper try/catch** invoking `scrape-regulations` then `scrape-federal-regulations`, capturing duration + error per call.
- **`logExecution()`** → insert into `cron_job_executions`:
  - `job_name`: `'trigger-scrapers'`
  - `executed_at`: invocation start
  - `status`: `'success'` if all scrapers ok, `'partial'` if some failed, `'error'` if all failed
  - `execution_time_ms`: total wall time
  - `error_message`: JSON string `{ runId, results: [...] }` (used as metadata bag since column doesn't exist)
- **`logRegulatoryError()`** on any scraper failure → insert into `regulatory_updates`:
  - `section_number`: `'scraper:<name>'`
  - `change_type`: `'scrape_error'`
  - `new_content`: error message + stack
  - `review_status`: `'error'`
  - `detected_at`: now()
- **Failure email**: on any scraper failure, invoke existing `send-email` (or whatever transactional sender the project uses) addressed to admin list with subject `[ProCannEdu] Regulatory scraper failure — <runId>` and body summarizing which scraper(s) failed.
- **Response**: 200 on full success, 207 on partial/total failure, JSON `{ success, runId, results, durationMs }`.
- **Auth gate**: accept either the `pg_cron` invocation header `x-invoked-by: pg_cron` (validated against a shared secret) or an authenticated admin JWT. Reject anonymous.

## 2. Adapt `monitor-comar-updates/index.ts`

Retarget reads to actual columns:

- `lastSuccessfulScrape` = `MAX(executed_at)` from `cron_job_executions` where `job_name='trigger-scrapers'` and `status IN ('success','partial')`.
- `lastRunSuccess` = boolean from latest row's `status='success'`.
- `dataAgeHours` = `(now - last_modified_at)` from `regulatory_content`.
- `staleWarning` = `dataAgeHours > 26` (one missed cycle threshold).
- Recent errors = last 10 rows from `regulatory_updates` where `change_type='scrape_error'`.
- Keep admin gate (JWT + `has_role(uid,'admin')`).

## 3. Schedule pg_cron jobs

Via `supabase--insert` (not migration — contains URL + anon key):

- **`comar-scrape-daily`**: `0 6 * * *` → POST `/functions/v1/trigger-scrapers` with `x-invoked-by: pg_cron` + anon key apikey header.
- **`comar-compliance-check`**: `0 8 * * *` → POST `/functions/v1/check-comar-compliance` (two hours after scrape so it reads fresh content).

## 4. Dashboard warning surface

In the existing COMAR/admin health surface that consumes `monitor-comar-updates`:

- If `staleWarning === true` → red banner: "Regulatory content has not refreshed in >26h (one missed scrape cycle). Last successful scrape: <ts>."
- If `lastRunSuccess === false` → amber banner with error excerpt + link to `regulatory_updates` error rows.

(Surface-only change; no business-logic edit.)

## 5. Runbook update

Append to `docs/system/comar-scraper-runbook.md` (or create if missing):

- Cron schedule table (06:00 / 08:00 UTC)
- Env var table noting service role key never appears in cron body (only anon key + `x-invoked-by` header)
- Failure-mode matrix: one scraper down (207 + email), all scrapers down (207 + email + amber dashboard), missed cycle (red dashboard at 26h)
- Verification sequence: cURL trigger-scrapers → inspect `regulatory_content.last_modified_at` → force a failure → confirm error email → verify 08:00 `check-comar-compliance` reads new content

---

## Technical Details

**Schema mapping (no migration):**

| Logical field | Actual column |
|---|---|
| run metadata | `cron_job_executions.error_message` (JSON-encoded) |
| scraper error | `regulatory_updates` with `change_type='scrape_error'` |
| last refresh | `regulatory_content.last_modified_at` |

**Files touched:**
- `supabase/functions/trigger-scrapers/index.ts` (rewrite)
- `supabase/functions/monitor-comar-updates/index.ts` (rewrite reads + remove TODO)
- `supabase/config.toml` (confirm `trigger-scrapers` stays `verify_jwt = false`; header-based auth inside)
- Dashboard component consuming `monitor-comar-updates` (banner)
- `docs/system/comar-scraper-runbook.md`
- pg_cron via `supabase--insert` (two `cron.schedule` calls)

**Secrets needed:**
- `CRON_SHARED_SECRET` (new) — validated against `x-invoked-by`/header signature
- Admin alert recipient list — reuse existing admin email config if present, else add `ADMIN_ALERT_EMAILS`

**Out of scope (next sprint):**
- Migration to add native `metadata jsonb` + `success boolean` columns
- Sentinel `regulations` table + FK for error rows
- Scraper backoff/retry logic
- Per-section diff summarization beyond current `analyze-regulatory-impact` invoke

---

## Verification (post-deploy checklist)

1. `curl POST /trigger-scrapers` with `x-invoked-by: pg_cron` + shared secret → expect 200 + structured `results[]`, new `cron_job_executions` row (`status='success'`), `regulatory_content.last_modified_at` advances.
2. Temporarily break `scrape-regulations` URL → expect 207, `regulatory_updates` error row, admin email delivered.
3. GET `/monitor-comar-updates` as admin → fields populated, `staleWarning=false`.
4. `SELECT * FROM cron.job WHERE jobname IN ('comar-scrape-daily','comar-compliance-check')` → two rows.
5. Wait for 08:00 UTC run → confirm `check-comar-compliance` logs new run.

**Confirm before build:** (a) admin alert recipient(s) — single address or list? (b) reuse existing transactional sender function name, or new wrapper?