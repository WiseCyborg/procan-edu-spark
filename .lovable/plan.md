# Production GO Closeout — Five Gates

Goal: close the five outstanding items from the Mission Control 🟡 Conditional GO, regenerate evidence, and produce a Production GO snapshot. No new feature work; this is reconciliation + validation only.

All work is logged under `docs/audit/2026-07/evidence/launch_closeout_2026-06-18/` so each gate has its own evidence artifact.

---

## Gate 1 — Security Event Triage (8 high/critical, 7d)

**Read-only investigation:**
- Query `security_events` last 7d filtered to `severity in ('high','critical')`.
- Pull adjacent `admin_operations_audit`, `api_console_audit`, `auth` events for each actor/timestamp.
- Classify each event: `expected_admin_action` | `test_artifact` | `benign_anomaly` | `requires_action`.

**Remediation (only if `requires_action`):**
- For each, propose a one-shot migration or edge-function fix in a separate follow-up; do NOT bundle into this closeout.

**Evidence:** `gate1_security_triage.md` — table of 8 events with classification + disposition.
**Exit:** 0 unexplained critical/high events.

---

## Gate 2 — Deadletter Backlog (206 entries)

**Triage via SQL (read-only first):**
- `SELECT job_type, count(*), min(moved_to_dlq_at), max(moved_to_dlq_at) FROM system_jobs_deadletter GROUP BY job_type;`
- Sample 3 rows per `job_type` to inspect `payload` + `last_error`.

**Disposition per group:** retry / fix+replay / duplicate / archive.

**Execution:** call existing `clear-deadletter-queue` edge function with `{ job_type, before_date }` for each archive bucket. For replay buckets, write a one-shot `replay-deadletter-batch` edge function (service role, scoped to `job_type`) and delete it after use.

**Evidence:** `gate2_deadletter_disposition.md` — per-job_type counts, action taken, residual count.
**Exit:** `system_jobs_deadletter` = 0 OR fully documented residual.

---

## Gate 3 — COMAR Seed Validation

**Verify:**
- `comar_versions` has at least one row with `effective_date <= now()` and the latest section reference.
- `regulatory_content` row count + most recent `last_modified_at`.
- `useCOMARVersion` hook returns `source: 'comar_versions'` (not fallback).
- Spot-check chatbot/coach grounding query returns regulatory snippets.

**If empty:** one-shot migration seeding the current active COMAR version (`14.17.05`, current effective date, section reference) into `comar_versions`. RLS/grants already in place.

**Evidence:** `gate3_comar_seed.md` — version row, content counts, sample coach grounding response.
**Exit:** `comar_versions` populated; hook reports `comar_versions` source.

---

## Gate 4 — PayPal Sandbox Round-Trip (Launch Blocker)

**Pre-check:** `paypal_configuration` has active sandbox creds (`getActivePayPalEnv()` returns `sandbox`); `create-course-payment-paypal` and capture/webhook functions deployed.

**Execution (manual, scripted assist):**
1. Create UAT student via existing `TestAccountCreator` flow.
2. Initiate purchase for one paid course (`create-course-payment-paypal`).
3. Complete sandbox approval in PayPal sandbox buyer account.
4. Land on `/payment-success`; observe redirect + entitlement creation.
5. Verify in DB:
   - `orders` row → `status = 'completed'`
   - `payments` row exists with `provider = 'paypal'`
   - `course_entitlements` row with `source = 'paypal'` (or course-payment equivalent)
   - `email_send_log` shows `payment-confirmation` template sent
6. Confirm course unlocks for the test user and email arrives.

**If any step fails:** fix in a scoped follow-up; do not paper over.

**Evidence:** `gate4_paypal_roundtrip.md` — timestamps, order id, screenshots/log excerpts, DB row IDs.
**Exit:** End-to-end PayPal path passes with zero manual DB intervention.

---

## Gate 5 — Orphan Video Assets (4)

**Investigate:**
- `SELECT id, title, vimeo_id, storage_path, created_at FROM video_assets WHERE module_id IS NULL;`
- For each: map to a `course_modules` row, mark `archived = true`, or tag with `unmapped_reason` (mirroring the module pattern).

**Execution:** single migration applying the per-asset disposition (UPDATE statements only).

**Evidence:** `gate5_orphan_videos.md` — per-asset disposition table.
**Exit:** 0 orphan `video_assets` without `archived` or `unmapped_reason`.

---

## Final Step — Production GO Snapshot

After all five gates are green:
1. Re-run the Mission Control aggregate SQL (same query as `mission_control_summary_2026-06-18.md`).
2. Write `docs/audit/2026-07/evidence/mission_control_summary_PRODUCTION_GO_<date>.md` with verdict 🟢 **GO** and links to the five gate evidence files.
3. Update `.lovable/plan.md` with the closeout completion marker.

## Out of Scope
- No UI changes to `LaunchReadiness.tsx`, `E2EReadinessChecklist`, or any hook.
- No new features, no schema changes beyond Gate 3 seed and Gate 5 video updates.
- No Stripe work (separate path).
- No moving users into UAT — that is a human step after this plan completes.

## Order of Execution
Gates 1, 3, 5 in parallel (independent reads + small migrations) → Gate 2 (deadletter sweep) → Gate 4 (PayPal, requires human in sandbox) → final snapshot.
