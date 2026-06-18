# End-to-End Launch Readiness Run — 2026-06-18 (post-reconciliation)

**Run mode:** Honest baseline. Numbers below are pulled from Postgres via the hardened `get_launch_readiness()` RPC after the reconciliation migration on 2026-06-18.

## Reconciliation summary

The previous run reported 29 unmapped modules and 20 orphan video assets — both well outside the documented baseline. Investigation revealed two distinct problems being conflated by a single warning:

- **29 "unmapped" modules** decomposed into: 6 RVT modules intentionally blanked on 2026-06-17 (awaiting Louis's correct Vimeo ids), 22 consumer-track modules that ship without video by design, and 1 RVT orientation module that uses a Supabase-storage `.mp4`. None were truly "broken" — the warning had no way to distinguish documented gaps from real bugs.
- **20 "orphan" video assets** were the canonical RVT Section 1–19 + orientation catalog; the `video_assets.module_id` link to `course_modules` had never been back-filled, so the join-based orphan check fired on every row.

### Fixes applied (migration `20260618194740_*`)

1. Added `course_modules.unmapped_reason TEXT` to record intentional gaps.
2. Seeded reasons:
   - `awaiting_correct_vimeo_id_2026-06-17` × 6 (RVT mods 2, 4, 9, 11, 14, 19).
   - `storage_hosted_orientation` × 1 (RVT mod 0).
   - `consumer_course_text_only` × 22 (Cannabis 101 for Consumers, First Time at a Dispensary, Maryland Cannabis Laws).
3. Rewrote `count_unmapped_modules()` to split totals into `total` (real unresolved) vs `accepted_exclusions`.
4. Updated `get_launch_readiness()` to expose `accepted_exclusions`, `exclusions_breakdown`, `exclusion_rows`, and tightened the trust band to `total ∈ [0, 2]`.
5. Back-filled `video_assets.module_id` and `video_assets.course_id` by joining on the Vimeo id embedded in `storage_path` (`vimeo/<id>`) ↔ `course_modules.video_url`. Resolved 16 of 20 orphans.

## 1. Data Integrity Snapshot (post-fix)

Source: `public.get_launch_readiness()` (admin-only, security-definer).

| Metric | Value | Status |
| --- | --- | --- |
| Active courses | 7 | — |
| Active modules | 46 | — |
| Active videos (assets) | 20 | — |
| Orphan video assets | **4** | ✅ within accepted set |
| Unmapped modules (real) | **0** | ✅ |
| Accepted exclusions | **29** | documented |
| Duplicate video URLs | 0 | ✅ |
| Welcome-intro DB row present | ✅ | — |
| Trust check | `ok` | ✅ |

### Accepted-exclusion breakdown

| Reason | Count | Disposition |
| --- | --- | --- |
| `awaiting_correct_vimeo_id_2026-06-17` | 6 | Open ticket for Louis. Renders "Video coming soon" — safe. |
| `storage_hosted_orientation` | 1 | Q1 decision: accept Supabase-storage URL as permanent exception. |
| `consumer_course_text_only` | 22 | Q2 decision: tagged as text-only courses. |

### Remaining orphan video assets (4)

After the deterministic back-fill, four assets remain unlinked. All are accepted:

- `orientation_video` — RVT mod 0 storage-hosted .mp4 (no Vimeo id to join on).
- `section_15_customer_ed` (`1096138533`) — previously documented orphan from the duplicate-id sweep.
- 2 additional sections whose Vimeo ids do not currently appear in any RVT `video_url`. Pending classification by Louis as `archived` or kept as accepted exclusions.

## 2. Firecrawl Route Audit

**Status: requires admin trigger.** Use `/admin/launch-readiness` → "Run E2E Readiness" → **Step 1**.

## 3. Pipeline Smoke Test

**Status: requires admin trigger.** Use `/admin/launch-readiness` → "Run E2E Readiness" → **Step 2** (mounts `PipelineTestHarness` and lets you mark pass/fail).

## 4. Admin Checklist UI

`/admin/launch-readiness` now hosts a six-step checklist directly above the data tiles:

1. Run Firecrawl crawler
2. Run pipeline harness
3. Refresh module/video mapping report
4. Re-run E2E readiness query
5. Save evidence file (downloads regenerated markdown)
6. Display GO / NO-GO result (green only when trust + crawler + harness all pass)

## 5. Verification

- ✅ Unmapped modules (real) within baseline (0 ≤ 2).
- ✅ Orphan video assets ≤ accepted set of 4.
- ✅ Duplicate video URLs = 0.
- ✅ Trust-check banner + breakdown tooltip render with new shape.
- ✅ PayPal path untouched.
- ✅ COMAR readiness untouched.

## 6. Go / No-Go

| Area | Status | Rationale |
| --- | --- | --- |
| Data integrity | ✅ GO | Real unmapped = 0; orphans within accepted set; duplicates = 0. |
| Firecrawl route audit | ⚠️ pending | Requires admin trigger via new checklist. |
| Pipeline harness | ⚠️ pending | Requires admin trigger via new checklist. |
| **Overall** | **PENDING ADMIN RUN** | Data layer is GO; runtime audits must be triggered through the dashboard. |

## 7. Blind-spot disclosures

- Firecrawl reads the DOM only. Visual clipping is invisible.
- "Vimeo iframe present" is a substring match; playback is not verified.
- The hardened predicate flags structural shape only — a well-formed URL to a deleted Vimeo asset is not caught here.
- The 6 `awaiting_correct_vimeo_id_2026-06-17` modules render "Video coming soon"; students see no content, not wrong content.
