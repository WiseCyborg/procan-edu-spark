# Two-Priority Delivery Plan

Both pipelines held to the same bar: **automated guarantees, not manual maintenance.** Nothing ships until each item below has a verified signal.

---

## Priority 1 — COMAR Scraper: Close the Loop

The `trigger-scrapers` / `monitor-comar-updates` rewrite landed and the runbook is in place. What's still missing is the **automation + alerting + proof it runs end-to-end without a human.**

### 1.1 Register pg_cron jobs (06:00 / 08:00 UTC)
Use `supabase--insert` (not migration) so the function URL + auth header stay project-scoped:

- `comar-scrape-daily` — 06:00 UTC → `POST /functions/v1/trigger-scrapers`
- `comar-compliance-check` — 08:00 UTC → `POST /functions/v1/check-comar-compliance`

Both jobs send `Authorization: Bearer <CRON_SHARED_SECRET>` so `trigger-scrapers` can reject anything that isn't pg_cron. (`pg_cron` + `pg_net` extensions enabled first.)

### 1.2 Provision the cron secret
Add `CRON_SHARED_SECRET` via `secrets--add_secret` and confirm `trigger-scrapers` validates it before doing any work. Reject with 401 if missing/mismatched.

### 1.3 Wire the three failure alert behaviors (explicit, not "alerting wired")
In `trigger-scrapers`:
1. **Scraper throws** → row in `regulatory_updates` with `change_type='scrape_error'` + Resend email to admin list.
2. **HTTP 5xx from source** → same error row + email, with status code in metadata bag.
3. **Partial success (1 of 2 scrapers fails)** → 207 response, error row for the failed one, success row for the other, single consolidated email.

Confirm Resend connector + `ADMIN_ALERT_EMAILS` secret are present; add via `standard_connectors--connect` / `secrets--add_secret` if not.

### 1.4 Dashboard staleness surface
`RegulatorySyncPanel` already reads `monitor-comar-updates`. Verify the warning copy explicitly cites the **26-hour threshold** ("one missed cycle") so the operator knows red banner = automation broke, not just "old data."

### 1.5 End-to-end verification (the proof)
Run the runbook sequence and capture results:
1. `supabase--curl_edge_functions` POST `/trigger-scrapers` with the cron secret → expect 200, new `cron_job_executions` row, `regulatory_content.last_modified_at` advances.
2. Force a failure (bad source URL via temporary env override OR mock 500) → expect 207, error row in `regulatory_updates`, email in `email_send_log`.
3. GET `/monitor-comar-updates` as admin → `lastSuccessfulScrape`, `dataAgeHours`, `staleWarning` all populated.
4. `SELECT * FROM cron.job WHERE jobname LIKE 'comar-%'` → two rows, correct schedules.
5. Trigger `check-comar-compliance` manually → confirms it reads the freshly-scraped content.

Each check either passes or blocks deploy. No "looks good."

---

## Priority 2 — Payment Fix: Audit Before Declaring Done

The route fix (`/payment/:applicationId` + dual param read) is in. Before this is deploy-ready, it has to be **audited against the full checklist and tested against all 6 scenarios.**

### 2.1 Audit report (Implemented / Partial / Missing)
Walk every checklist item against current code in `src/App.tsx`, `src/pages/Payment.tsx`, the approval email template, and the Stripe checkout edge function. Output a table:

| Checklist item | Status | Evidence (file:line or test result) |

Items to verify at minimum:
- Route accepts both `/payment/:id` and `/payment?application_id=` ✓ (verify)
- Approval email link format matches the new route
- Unauthenticated user hitting `/payment/<id>` → redirected to `/auth` with return URL preserved
- Application not found → branded error, not blank
- Application already paid → friendly "already complete" state, not duplicate Stripe session
- Application belongs to a different user → 403/branded denial (no enumeration)
- Stripe checkout session creation still works with the id passed via params
- Success / cancel return URLs land on correct pages

### 2.2 Six-scenario test matrix
Execute each via `supabase--curl_edge_functions` for backend paths + session replay / browser preview for UI:
1. Logged-in owner, valid app, unpaid → reaches Stripe checkout.
2. Logged-in owner, valid app, already paid → "already paid" state.
3. Logged-out user with valid link → auth redirect, then resumes payment.
4. Logged-in user, app belongs to someone else → denied, no data leak.
5. Invalid/nonexistent application id → branded not-found.
6. Legacy query-string link (`?application_id=`) → still works (backwards compat).

Each scenario gets pass/fail + screenshot or response body.

### 2.3 Deploy readiness gate
A single explicit statement at the end: **READY** or **NOT READY**, with the blockers listed if not. No soft language.

---

## Out of Scope (held for next sprint)
- Migration to add native `metadata jsonb` + `success boolean` to `cron_job_executions` (JSON-in-`error_message` is the bridge).
- Backoff/retry inside `trigger-scrapers` (pg_cron retries next cycle).
- Per-section diff beyond current `analyze-regulatory-impact`.
- Payment refactor to a dedicated `/checkout` flow.

---

## Technical Details
- **Secrets needed:** `CRON_SHARED_SECRET` (new), `ADMIN_ALERT_EMAILS` (verify), Resend connection (verify).
- **Files touched:** none new for P1 beyond cron SQL via `supabase--insert`; P2 is verification-only unless audit surfaces a gap.
- **Tools used:** `supabase--insert` (cron), `secrets--add_secret`, `standard_connectors--connect` (Resend if missing), `supabase--curl_edge_functions`, `supabase--read_query`, `supabase--edge_function_logs`, browser/session replay for UI scenarios.
- **Deliverables:** (1) cron rows visible in `cron.job`, (2) verification log pasted in chat, (3) P2 audit table + 6-scenario results + READY/NOT READY verdict.
