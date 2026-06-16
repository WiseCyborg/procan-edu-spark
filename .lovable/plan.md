# Pre-Launch Verification & B1 Filter

Four steps, in order. Nothing here writes production data except the detector-filter code change (read-only effect on `issues_detected`) and a doc update routing the license-pair decision to a named person.

## Step 1 — Verify Plan A actually increments counters

The patch is deployed but unverified. "Applied ≠ verified."

- Trigger one agent run via Admin → Pipeline Health → **Run Agent** (or `supabase--curl_edge_functions` POST to `/pipeline-health-agent` if the UI is inconvenient).
- Read `agent_configs` for `agent_name = 'pipeline-health-agent'` immediately before and after. Confirm:
  - `run_count` increments by exactly 1
  - `success_count` increments by exactly 1 (assuming no thrown error)
  - `last_run_at` is non-null and within the last 60s
- Confirm a fresh row appears in `pipeline_health_snapshot` with a matching `created_at`.
- Capture before/after values into `docs/audit/2026-07/evidence/e2e_run_2026-06-16.md` under a new "Plan A verification" subsection.

Race-condition note (file-and-forget): read-modify-write on the counter can lose an increment under truly concurrent runs. Acceptable because the agent runs on a schedule, not concurrently. Documented in the evidence file as a known limitation, not a bug to fix now.

**Exit:** Plan A is closed only when counters are observed ticking. If they don't tick, stop and diagnose before touching Step 2+.

## Step 2 — Spot-check the "33 auto-fixed" bucket

This is the load-bearing number in the reframe. Trust but verify, especially since the agent we just patched is in the same neighborhood as the auto-fix path.

- Pull the 33 events from `pipeline_health_events` where the triage doc classified them as auto-fixed. Sort by recency, pick 3 across different dimensions (apps / orgs / seats) to maximize coverage.
- For each of the 3, follow the event's `entity_id` into the underlying production table (`dispensary_applications`, `organizations`, or `org_seat`-related rows) and confirm the actual state matches "fixed" — not just that the event row is flagged resolved.
  - Example: if event says "org missing manager → auto-assigned", confirm `organization_members` actually contains a manager row for that org.
- Record the 3 entity IDs, expected state, observed state, and pass/fail in the evidence file.

**Exit:** 3/3 confirm fixed → trust the 33 bucket, proceed. Any fail → expand to 5 more; if any of those fail, the 33 bucket is suspect and the reframe loses that line — escalate before the launch call.

## Step 3 — Ship B1 (detector filter for UAT/E2E residue)

Read-only effect on what counts toward `issues_detected`. No data writes.

- Locate the detector queries inside `pipeline-health-agent` (and any sibling detectors flagged in the triage doc) that emit `apps` / `orgs` / `seats` findings.
- Add a filter excluding rows whose name matches the test-residue patterns documented in `docs/audit/2026-07/evidence/health_findings_triage_2026-06-16.md`:
  - `UAT Test Dispensary%`, `UAT Final%`, `E2E Test Org %`, and the specific `ABC` test record (by `id`, not by name, to avoid filtering the real `ABC` org from Step 4).
- Use a single shared constant / helper rather than inlining the patterns in each detector.
- Re-deploy, trigger one run, confirm `issues_detected` drops from 23 admin-attention items to ~5 (and the snapshot reflects it). Capture before/after numbers in the evidence file.

**Exit:** Visible list shrinks to the ~5 real items. Hold B2–B6 until this is eyeballed and approved.

## Step 4 — Route the 3 duplicate-license pairs to a human

Not a code change — a routing/ownership change so this doesn't get lost.

- In `docs/audit/2026-07/PRE_CALL_SIGNOFF_2026-06-14.md`, add a "Human Decisions Required Before GO" section listing the 3 pairs (`DA-23-12345`, `DA-25-12345`, `123456689`) with: the two candidate record IDs per pair, who created each, last activity timestamps, and a blank "Canonical: ____  Decided by: ____  Date: ____" line.
- Name the owner explicitly (Danielle or Louis — confirm which before writing, see Question below). This is a business decision, not an automation candidate.

## Out of scope (explicit)

- B2–B6 remediation plans (token issuance, stale-org triage, etc.) — held until Step 3 result is reviewed.
- Any data writes against the 23/29/23 buckets.
- Refactoring the agent counter to be race-safe (documented as known, not fixing).
- Touching the real `ABC` org from 134 days ago — that's a B-series item, not part of this plan.

## Technical details

- Tools used: `supabase--curl_edge_functions` (trigger agent), `supabase--read_query` (counters, events, entity spot-checks), code edits to `supabase/functions/pipeline-health-agent/index.ts` for the B1 filter, doc edits to two existing files. No migrations.
- Evidence trail: all four steps append to `docs/audit/2026-07/evidence/e2e_run_2026-06-16.md` and (for Step 4) `PRE_CALL_SIGNOFF_2026-06-14.md`.

## Question before I start

Who owns the duplicate-license decision — Danielle, Louis, or both jointly? I'll write the named owner into the sign-off doc rather than leaving a `TBD`.
