# End-to-End Regression + Welcome Video Backfill (v2)

## Goal
Get a defensible GO/NO-GO verdict for Danielle & Louis with every video playable, by (a) backfilling `welcome-intro` and (b) running a one-shot service-role function that refreshes `pipeline_health_snapshot` + executes the regression harness, with an explicit pass threshold, verified cleanup, and migration-track coordination.

## 1. Welcome-intro backfill (unchanged, low risk)
- Migration: `UPDATE public.video_assets SET storage_path = 'vimeo/1096146284?h=e90b8e5dfc', updated_at = now() WHERE asset_key = 'welcome-intro';`
- Source: `src/pages/Index.tsx` already references `https://vimeo.com/1096146284/e90b8e5dfc`.
- `get-video-url` already parses `vimeo/<id>?h=<hash>` (line 106) — no code change.
- Verify: curl `get-video-url` for `welcome-intro` → expect `provider: "vimeo"`, `vimeo_id: "1096146284"`, `vimeo_hash: "e90b8e5dfc"`.

## 2. Explicit pass/fail threshold (the verdict contract)
The one-shot function returns `verdict: "GO" | "NO-GO"`. `GO` requires **all** of the following — if any single check fails, verdict is `NO-GO` with the failing items enumerated:

| # | Check | Pass criterion |
|---|---|---|
| 1 | `post-migration-regression` HTTP response | status 200 AND body `success === true` AND `failures.length === 0` |
| 2 | Regression sub-checks | every item in `results[]` has `status === "pass"`; any `"fail"` or `"error"` ⇒ NO-GO |
| 3 | `pipeline_health_snapshot` refresh | a new row inserted in the last 60 s AND `pipelines_healthy === pipelines_total` (currently 7/7) |
| 4 | Video smoke — welcome-intro | 200, `provider === "vimeo"`, `vimeo_id` + `vimeo_hash` populated |
| 5 | Video smoke — one `section_*` Vimeo asset | 200, `provider === "vimeo"` |
| 6 | Video smoke — one MP4 (`training-videos`) asset, if any exist | 200, `provider === "supabase"`, signed URL returned |
| 7 | `regression_runs` insert | row written with `verdict` + full payload |

A function that merely "ran without erroring" is explicitly **NO-GO**. The verdict line in the sign-off doc cites the exact check counts (e.g. `GO — 7/7 pipelines healthy, 24/24 regression checks pass, 3/3 video smoke pass`).

## 3. One-shot function `ops-run-e2e-regression`
- New edge function, service-role internally, guarded by header `x-ops-token` matching new runtime secret `OPS_REGRESSION_TOKEN`.
- Performs steps 1–7 above and returns the verdict payload.
- Called exactly once via `supabase--curl_edge_functions`.

## 4. Cleanup with verified deletion (not asserted)
After the run, in this order, with evidence captured at each step:
1. `supabase--delete_edge_functions(["ops-run-e2e-regression"])` → capture response.
2. `secrets--delete_secret(["OPS_REGRESSION_TOKEN"])` → capture response.
3. **Verification probe:** `curl` the deleted function URL → expect 404/`FUNCTION_NOT_FOUND`. Record status code + body in evidence.
4. **Verification probe:** `secrets--fetch_secrets` → confirm `OPS_REGRESSION_TOKEN` is absent. Record listing.
5. If either probe shows the function or secret still exists, the evidence file is marked `CLEANUP_FAILED` and the chat verdict is downgraded to `NO-GO — cleanup failed, privileged endpoint still live`. We do not proceed until manual removal succeeds.

## 5. Migration-track coordination
- Add a `MIGRATION_COORDINATION` block to the evidence file noting: "welcome-intro currently uses `vimeo/1096146284?h=e90b8e5dfc`. When the Vimeo → Supabase Storage migration runs, the migration script must (a) re-upload this asset to `training-videos/welcome-intro.mp4`, (b) overwrite `storage_path` only after the upload succeeds, and (c) preserve the Vimeo reference until the new signed URL is verified playable."
- Append the same note as a checklist item in `docs/VIDEO_ENCODING_RUNBOOK.md` so the migration owner sees it before running.
- No code-level guard is added; this is procedural coordination only.

## 6. Evidence & verdict
Write `docs/audit/2026-07/evidence/e2e_run_2026-06-16.md` containing:
- Pass-criteria table (section 2) with actual values per check.
- `pipeline_health_snapshot` row.
- `regression_runs` row id + payload excerpt.
- Video smoke table.
- **Cleanup section**: deletion responses + 404 probe + secret-listing probe.
- Migration-coordination note (section 5).

Append one line to `docs/audit/2026-07/PRE_CALL_SIGNOFF_2026-06-14.md`:
`2026-06-16 18:xx UTC — <GO|NO-GO> — pipelines x/7, regression x/x, video x/3, cleanup verified <yes|no>`

Post the same line back in chat.

## Out of scope
- Schema changes beyond the one `video_assets` row.
- Vimeo → Storage migration itself (tracked separately; coordination note only).
- Player code, RLS, or auth changes.

## Technical notes
- Vimeo id/hash sourced from public code; no new third-party credentials.
- Service-role usage stays inside the edge function; anon caller only sees the JSON verdict.
- Wall time ≈ 3–5 min including cleanup probes.
