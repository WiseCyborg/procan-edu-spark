
# E2E Reconciliation — Unmapped Modules & Orphan Video Assets

Goal: get the launch-readiness dashboard back inside the documented baseline (5–8 unmapped, 0 unjustified orphans) by **resolving or formally documenting** every offending row. No suppression of the trust-check banner.

## What the data actually says

I pulled the live rows. Two distinct problems are being conflated by the current trust-check threshold:

### A. The 29 "unmapped modules" decompose into 4 buckets

1. **6 RVT modules intentionally unmapped on 2026-06-17** (per `docs/audit/2026-07/evidence/video_mapping_correction_2026-06-17.md`, Groups 1–5). These were blanked because duplicate Vimeo ids pointed to the wrong subject. They are **accepted exclusions awaiting Louis's correct ids**:
   - mod 2 Patient Rights and Privacy
   - mod 4 Inventory Management and Tracking
   - mod 9 Point of Sale Systems and Transactions
   - mod 11 Cannabis Cultivation Basics
   - mod 14 Age Verification and ID Checking
   - mod 19 Supervising Compliance Operations
2. **1 RVT module with `bad_format`** — mod 0 "Welcome & Platform Orientation" points at a `.mp4` in the `ProCannVideos` Supabase storage bucket. This is the orientation video, intentionally not on Vimeo. **Decision needed (see Q1).**
3. **22 consumer-track modules with `video_url IS NULL`** across three courses that were never given Vimeo content:
   - Cannabis 101 for Consumers (10 modules)
   - First Time at a Dispensary (8 modules)
   - Maryland Cannabis Laws (4 modules)
   These courses appear in the catalog but have no recorded video curriculum. **Decision needed (see Q2).**

### B. The 20 "orphan video assets" are the canonical RVT catalog

All 20 rows in `video_assets` with `module_id IS NULL` are the Section 1–19 + orientation source catalog. The RVT `course_modules.video_url` strings reference the same Vimeo ids, but the `video_assets.module_id` foreign-key column was never back-filled, so the join-based orphan check reports them all. They are **not lost content** — they are the master list with a missing linkage.

## Plan

### Step 1 — Back-fill `video_assets.module_id` for the RVT catalog (Problem B)

For each `video_assets` row whose `storage_path` matches `vimeo/<id>`, find the RVT `course_modules` row whose `video_url` contains the same `<id>` and set `video_assets.module_id = course_modules.id` and `video_assets.course_id = course_modules.course_id`. This is a single deterministic SQL `UPDATE ... FROM` join — no guessing. Expected result: ~17 of the 20 orphans resolve. The remainder (orientation `.mp4`, any unreferenced section, and `1096138533` which the prior report already flagged as orphan) get a per-row classification recorded in the new evidence doc:

- `orientation_video` → tied to RVT mod 0 by `asset_key` mapping (no Vimeo id).
- `section_15_customer_ed` (`1096138533`) → already documented orphan from the duplicate-id sweep; keep as accepted exclusion.
- Any others → classify as `archived` (`is_active = false`) only if confirmed unused; otherwise leave as accepted exclusion with reason.

### Step 2 — Reclassify the 6 intentionally-unmapped RVT modules (Problem A.1)

Add a new column `course_modules.unmapped_reason text` (nullable). Set it to `'awaiting_correct_vimeo_id_2026-06-17'` for the six ids listed above. Update `count_unmapped_modules()` to **exclude** rows where `unmapped_reason IS NOT NULL` from the `total`, but return them in a new `accepted_exclusions` count and breakdown. The trust-check baseline becomes: `total ∈ [0, 2]` (orientation + Q1/Q2 outcome).

### Step 3 — Handle the orientation `.mp4` (Problem A.2)

Pending Q1: either widen the URL convention to allow the Supabase storage URL for the orientation slot only (mark with `unmapped_reason = 'storage_hosted_orientation'`), or queue a Vimeo re-upload task. Either way, it stops counting as `bad_format` once a reason is recorded.

### Step 4 — Decide consumer-track modules (Problem A.3)

Pending Q2. Three viable outcomes per course:
- **Mark course inactive** (`courses.is_active = false`) — removes its modules from the readiness query entirely.
- **Tag every module with `unmapped_reason = 'consumer_course_text_only'`** — keeps the course visible but documents the absence of video.
- **Block launch on these courses** — leave unmapped and accept a red banner until videos exist.

### Step 5 — Migration + RPC updates

One migration:
1. `ALTER TABLE course_modules ADD COLUMN unmapped_reason text;`
2. Seed `unmapped_reason` for the 6 RVT modules (and orientation / consumer modules per Q1/Q2).
3. Update `count_unmapped_modules()` to return `{ total, accepted_exclusions, breakdown, exclusions_breakdown }`.
4. Update `get_launch_readiness()` to pass the new shape through and tighten `trust_check` to `total ∈ [0, expected_q1_q2_count]`.
5. One-shot `UPDATE video_assets ... FROM course_modules ...` to back-fill `module_id` / `course_id` for the 17 deterministic matches.

### Step 6 — Admin checklist UI on `/admin/launch-readiness`

Add a new "Run E2E Readiness" card above the existing stat tiles with six action rows, each with a button + last-run timestamp + ✓/⚠ status pulled from existing tables:

1. **Run Firecrawl crawler** — invokes `launch-audit-crawler` (already exists).
2. **Run pipeline harness** — links to / mounts `PipelineTestHarness`.
3. **Refresh module/video mapping report** — calls `get_launch_readiness()` and displays the new `accepted_exclusions` breakdown.
4. **Re-run E2E readiness query** — re-invokes the same RPC and updates the stat tiles + trust banner.
5. **Save evidence file** — opens a download of the regenerated markdown report (generated client-side from the RPC payload + last Firecrawl run + last pipeline harness run).
6. **Display GO / NO-GO result** — a single pill at the top that turns green only when (a) trust_check = ok, (b) Firecrawl rollup has no FAIL, (c) pipeline harness last status = success.

Also surface `accepted_exclusions` in the existing breakdown tooltip so it is visible without opening the doc.

### Step 7 — Re-run and regenerate evidence

After Step 5 migrates and Step 6 ships:
- Admin opens `/admin/launch-readiness`, runs items 1–4, downloads the new evidence file.
- Replace `docs/audit/2026-07/evidence/e2e_readiness_run_2026-06-18.md` with the regenerated report. Confirm:
  - `unmapped_modules.total` is within the new baseline.
  - `accepted_exclusions` enumerates every documented row with its reason.
  - `orphan_video_assets` ≤ 3 (orientation + `1096138533` + any explicitly accepted).
  - PayPal path unchanged (no code touched).
  - COMAR readiness unchanged (no code touched).
  - Trust-check banner + breakdown tooltip still render.

## Technical details

- **Files touched**
  - `supabase/migrations/<new>.sql` — column add, seed, RPC updates, asset back-fill.
  - `src/hooks/useLaunchReadiness.ts` — extend types for `accepted_exclusions` / `exclusions_breakdown`.
  - `src/pages/admin/LaunchReadiness.tsx` — new "Run E2E Readiness" checklist card; tooltip update; GO/NO-GO pill.
  - New `src/components/admin/E2EReadinessChecklist.tsx` — the 6-row action card.
  - New `src/lib/launchReadinessReport.ts` — client-side markdown generator for Step 6 item 5.
  - `docs/audit/2026-07/evidence/e2e_readiness_run_2026-06-18.md` — regenerated after admin run.
- **No changes** to `launch-audit-crawler` or `PipelineTestHarness` logic — only invoked from the new card.
- **No new tables.** One column, two RPC bodies replaced, one targeted `UPDATE`.

## Blockers — need answers before Step 3 / Step 4 are executable

```text
Q1: Orientation .mp4 (RVT mod 0) — accept the Supabase storage URL as a
    permanent exception, or block until re-uploaded to Vimeo?

Q2: Consumer tracks with zero videos (Cannabis 101, First Time at a
    Dispensary, Maryland Cannabis Laws) — mark courses inactive,
    accept as "text-only courses", or block launch on them?
```

Steps 1, 2, 5 (the schema + back-fill), 6, and 7 can proceed in parallel with the answers; Steps 3 and 4 only need the seed values once Q1 / Q2 are resolved.
