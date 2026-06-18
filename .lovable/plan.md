# End-to-End Launch Readiness Run (Option A confirmed)

Convention locked: `vimeo/<id>?h=<hash>` is the only valid `course_modules.video_url` shape. Anything else (NULL, empty, `'TBD'`, bare numeric id, non-vimeo URL, dangling storage ref) counts as unmapped.

## Steps

1. **Preflight secrets**
   - Confirm `PREVIEW_AUDIT_URL` and `FIRECRAWL_API_KEY` are set; add if missing.

2. **Harden `get_launch_readiness()` (migration)**
   - New helper `public.count_unmapped_modules()` returning `{ total, breakdown: { null_or_empty, placeholder, bad_format, dangling } }`.
   - Predicate: a module is mapped iff `video_url ~ '^vimeo/[0-9]+\?h=[a-zA-Z0-9]+$'` AND the referenced asset exists in `video_assets`.
   - `get_launch_readiness()` returns `unmapped_modules`, `unmapped_breakdown`, and `trust_check` (`ok` when total ∈ [5,8] including orphan `1096138533`; otherwise `suspicious`).
   - UI banner turns red when `trust_check = suspicious` ("RPC returned a number outside the expected baseline — query may be wrong").

3. **Run Firecrawl baseline audit**
   - Invoke `launch-audit-crawler` over the 7 canonical routes.
   - Capture per-route PASS/WARN/FAIL, welcome-intro probe, screenshot URLs.

4. **Run pipeline smoke test**
   - Execute `PipelineTestHarness` end-to-end (register → verify → journey → modules → cert).
   - Record failed steps with `error_code`.

5. **Compile readiness report**
   - Write `docs/audit/2026-07/evidence/e2e_readiness_run_2026-06-18.md` containing:
     - Stat-tile numbers, rollup status, unmapped list with reasons
     - Firecrawl per-route table + screenshot links
     - Pipeline harness step-by-step result
     - Blind-spot disclosures
     - Go / No-Go recommendation per area

6. **Surface in UI**
   - Link the evidence doc from the LaunchReadiness header.
   - Rollup pill reflects the worst of: trust check, Firecrawl rollup, pipeline harness.

## Technical Notes

- One migration: `count_unmapped_modules()` + updated `get_launch_readiness()`. No new tables.
- `useLaunchReadiness.ts`: extend `ReadinessSnapshot` with `unmapped_breakdown` and `trust_check`; render banner + breakdown chips.
- `LaunchReadiness.tsx`: add trust-check banner above stat tiles; add evidence-doc link in header.
- No changes to `launch-audit-crawler` logic — only invoked.
- Frontend/business-logic surface is limited to the readiness page.
