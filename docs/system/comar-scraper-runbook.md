# COMAR Regulatory Scraper Runbook

End-to-end operational reference for the daily regulatory content pipeline.

## Schedule (UTC)

| Job | Cron | Target | Purpose |
|---|---|---|---|
| `comar-scrape-daily` | `0 6 * * *` | `POST /functions/v1/trigger-scrapers` | Pulls latest COMAR + federal regulations, hashes, diffs, persists. |
| `comar-compliance-check` | `0 8 * * *` | `POST /functions/v1/check-comar-compliance` | Re-evaluates platform compliance against freshly-scraped content. |

The 2-hour gap guarantees compliance check sees content from the same morning's scrape, even if the scrape runs long.

## Secrets

| Secret | Where used | Notes |
|---|---|---|
| `CRON_SHARED_SECRET` | `trigger-scrapers` auth gate | Sent by pg_cron in `x-cron-secret` header. **Never** sent as service-role key. |
| `RESEND_API_KEY` | failure alert email | Reuses platform Resend account. |
| `ADMIN_ALERT_EMAILS` (optional) | failure alert email | Comma-separated. If unset, fans out to all `user_roles.role='admin'` user emails. |
| `SMTP_FROM` | failure alert From: header | Reused from existing email infra. |

The pg_cron job body contains **only** the project URL, the anon key (as `apikey`), and `x-cron-secret`. The service-role key never appears in any cron body.

## Failure-mode matrix

| Symptom | trigger-scrapers HTTP | DB writes | Email | Dashboard |
|---|---|---|---|---|
| All scrapers succeed | 200 | `cron_job_executions.status='success'` | — | green |
| One scraper fails | 207 | `cron_job_executions.status='partial'` + 1 `regulatory_updates` error row | yes | amber (lastRunSuccess=false) |
| All scrapers fail | 207 | `cron_job_executions.status='error'` + N error rows | yes | amber |
| Cron missed entirely | (no row) | nothing new | none from this run | red at 26h (`dataAgeHours > 26`) |
| Auth gate rejects caller | 401 | nothing | none | none |

## Schema mapping (no migration)

The runtime targets the **existing** column shapes:

- `cron_job_executions` — uses `job_name`, `executed_at`, `status`, `execution_time_ms`. Per-run metadata (`runId`, per-scraper results, invoker) is JSON-encoded into `error_message` because there's no `metadata jsonb` column yet.
- `regulatory_updates` — scraper failures land here as `change_type='scrape_error'`, `review_status='error'`, `section_number='scraper:<name>'`, `new_content=<error text>`. Successful diffs continue to use `change_type IN ('added','modified')` from the underlying scraper.
- `regulatory_content.last_modified_at` — the canonical freshness source for the staleness banner.

A future migration could add native `metadata jsonb` and `success boolean` to `cron_job_executions`; the orchestrator can adopt those without changing call sites.

## Verification sequence

1. **Manual trigger**
   ```bash
   curl -X POST "$SUPABASE_URL/functions/v1/trigger-scrapers" \
     -H "apikey: $SUPABASE_ANON_KEY" \
     -H "x-cron-secret: $CRON_SHARED_SECRET"
   ```
   Expect `200` with `{ success: true, status: "success", results: [...] }`.

2. **Confirm logged execution**
   ```sql
   select executed_at, status, execution_time_ms
   from cron_job_executions
   where job_name = 'trigger-scrapers'
   order by executed_at desc
   limit 5;
   ```

3. **Confirm content advanced**
   ```sql
   select section_number, last_modified_at
   from regulatory_content
   order by last_modified_at desc
   limit 5;
   ```

4. **Force a failure** (temporarily change `scrape-regulations` URL to an invalid host, redeploy, re-trigger). Expect:
   - `207` response
   - row in `regulatory_updates` with `change_type='scrape_error'`
   - alert email to admin recipients

5. **Restore and verify compliance check at 08:00 UTC**
   ```sql
   select executed_at, status
   from cron_job_executions
   where job_name = 'check-comar-compliance'
   order by executed_at desc
   limit 3;
   ```

6. **Admin dashboard** — open the admin health surface; `Live Regulatory Sync` panel should show `lastSuccessfulScrape` recent (`< 26h`) and no stale warning.

## Manual operations

- **Re-run scrape on demand** — `curl` with admin JWT (no cron secret required if a real admin token is presented).
- **Inspect last run payload** — `select error_message from cron_job_executions where job_name='trigger-scrapers' order by executed_at desc limit 1;` then parse JSON.
- **Disable cron temporarily** — `select cron.unschedule('comar-scrape-daily');` Re-enable by re-running the schedule SQL.
