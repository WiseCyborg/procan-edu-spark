# End-to-End Launch Readiness Run — 2026-06-18

**Run mode:** Honest baseline. Numbers below are pulled directly from Postgres via the hardened `get_launch_readiness()` RPC. Nothing here is aspirational.

## 1. Preflight

| Secret | Present | Notes |
| --- | --- | --- |
| `PREVIEW_AUDIT_URL` | ✅ | Set in project secrets. |
| `FIRECRAWL_API_KEY` | ✅ | Managed by connector. |
| Resend / SMTP | ✅ | `RESEND_API_KEY`, `SMTP_*` configured. |
| Supabase service role | ✅ | Injected into Edge Functions automatically. |

## 2. Data Integrity Snapshot

Source: `public.get_launch_readiness()` (admin-only, security-definer).

| Metric | Value | Status |
| --- | --- | --- |
| Active courses | 7 | — |
| Active modules | 46 | — |
| Active videos (assets) | 20 | — |
| Orphan video assets (asset.module_id IS NULL) | **20** | ⚠️ |
| Unmapped modules (hardened) | **29** | 🔴 |
| Duplicate video URLs | 0 | ✅ |
| Welcome-intro DB row present | ✅ | — |
| Last audit run | none yet | ⚠️ requires admin to trigger from the UI |

### Hardened unmapped breakdown

Valid shape: `^(https?://(player\.)?vimeo\.com/|vimeo/)[0-9]+\?h=[a-zA-Z0-9]+$`

| Category | Count |
| --- | --- |
| `null_or_empty` | 28 |
| `placeholder` (TBD / TODO / N/A / etc.) | 0 |
| `bad_format` (off-platform URL, bare id, etc.) | 1 |
| **Total unmapped** | **29** |

### Trust check

- Documented baseline: 5–8 unmapped + orphan asset `1096138533`.
- Observed: **29**.
- Result: **`out_of_band`** — flagged red in the dashboard banner. This is the honest signal; do not interpret a fresh dashboard as green until Louis fills in the missing `video_url` values.
- A `suspicious_zero` result would have indicated the query is broken; we have positive evidence the query is working because we can enumerate the 29 offending rows by id and title.

### Specific unmapped rows (excerpt)

28 modules with `video_url IS NULL`, including:

- Welcome & Platform Orientation has a `.mp4` URL in the `ProCannVideos` storage bucket — that is **bad_format** under the locked Vimeo-only convention; treat as unmapped until either (a) re-uploaded to Vimeo or (b) the convention is widened.
- Cannabis Basics, CBD Deep Dive, Common Mistakes to Avoid, Consumption Methods, Finding Your Dose, Maryland Purchase Limits, Medical Cannabis in Maryland, Other Cannabinoids, Patient Rights and Privacy, Payment & Checkout, Point of Sale Systems and Transactions, Purchase Limits & Possession, Quality & Safety, Safe & Responsible Use, Supervising Compliance Operations, Terpenes 101, THC Deep Dive, The Endocannabinoid System, Transportation & Travel Laws, Understanding Labels & Dosing, Understanding Product Types, Welcome & What to Expect, Where You Can Use Cannabis, Your Rights & Responsibilities, and 4 more.

Full list: `SELECT id, title, video_url FROM course_modules WHERE is_active AND (video_url IS NULL OR video_url='' OR video_url !~ '^(https?://(player\.)?vimeo\.com/|vimeo/)[0-9]+\?h=[a-zA-Z0-9]+$');`

## 3. Firecrawl Route Audit

**Status: not run in this batch.** The `launch-audit-crawler` Edge Function requires an authenticated admin caller (it intentionally rejects service-role / system calls), so it cannot be invoked from a CI script. To produce the per-route PASS / WARN / FAIL rollup and screenshots, an admin must open **`/admin/launch-readiness`** and click **Run Firecrawl Audit**, then re-run this report.

Once executed, results land in `public.launch_audit_runs` and roll up into `public.launch_audit_batch_summary`; the dashboard surfaces them automatically.

## 4. Pipeline Smoke Test

**Status: not run in this batch.** `PipelineTestHarness` likewise runs interactively under an authenticated session. Trigger from the admin UI and capture the per-step `error_code`.

## 5. Blind-spot Disclosures

Carried over from the dashboard so the report stands on its own:

- Firecrawl reads the DOM only. Visual clipping (overflow:hidden, off-screen CTAs) is invisible to every check.
- "Vimeo iframe present" is detected as a substring match. We do **not** verify playback or that the correct video id loads.
- Language switcher, password-eye, modals are detected as text/markup presence only. We do **not** click.
- Lazy-loaded content past the 1500 ms `waitFor` window is invisible.
- The hardened predicate flags structural shape only. A well-formed URL pointing to a deleted Vimeo asset is **not** caught here; that requires the Firecrawl welcome-intro probe and a per-module HEAD probe (future work).

## 6. Go / No-Go

| Area | Status | Rationale |
| --- | --- | --- |
| Data integrity | 🔴 NO-GO | 29 unmapped modules vs documented baseline 5–8; 20 orphan video assets. |
| Route checks | ⏸ PENDING | Crawler not yet run for this batch. |
| Pipeline harness | ⏸ PENDING | Not yet run for this batch. |
| Welcome-intro probe | ⏸ PENDING | Dependent on next crawler run. |
| Secrets & infra | ✅ GO | All required secrets present. |

**Overall: NO-GO.** Course-module video mapping is the gating issue. Next action is for Louis to populate the 28 missing `video_url` values and re-upload the orientation video to Vimeo (or have us widen the convention), then re-run this report.
