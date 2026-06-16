# End-to-End Regression + Welcome Video Backfill (v3 — embedded ephemeral token)

## Goal
Defensible GO/NO-GO for Danielle & Louis with every video playable. No new persisted secret; the one-shot privileged endpoint dies with its function bundle.

## 1. Welcome-intro backfill (already executed in v2 run)
- `UPDATE public.video_assets SET storage_path = 'vimeo/1096146284?h=e90b8e5dfc', updated_at = now() WHERE asset_key = 'welcome-intro';` — done.
- Re-verify post-run via `get-video-url` smoke check (section 2, check #4).

## 2. Pass/fail threshold (verdict contract)
`verdict = "GO"` only if **every** check below passes. Any failure ⇒ `NO-GO` with the failing items enumerated in chat and the evidence file.

| # | Check | Pass criterion |
|---|---|---|
| 1 | `post-migration-regression` HTTP | status 200 AND body `success === true` |
| 2 | Regression verdict | `verdict === "SHIPPABLE"` AND `deterministic === true` (run1 + run2 both zero failures, signatures match) |
| 3 | `pipeline_health_snapshot` refresh | new row id (≠ pre-run id) AND `last_run_at` within 120 s AND `pipelines_healthy === pipelines_total` |
| 4 | Video smoke — `welcome-intro` | 200, `provider === "vimeo"`, `vimeo_id === "1096146284"`, `vimeo_hash === "e90b8e5dfc"` |
| 5 | Video smoke — one `section_*` Vimeo asset | 200, `provider === "vimeo"` |
| 6 | Video smoke — first MP4 asset in `video_assets` (if any) | 200, `provider === "supabase"`, signed URL returned. Skipped (and noted) only if zero MP4 rows exist. |
| 7 | `regression_runs` row | inserted by `post-migration-regression` with status `complete` |

"Function ran without throwing" is explicitly **NO-GO**.

## 3. One-shot function `ops-run-e2e-regression` (revised auth)
- Replace JWT/service-role auth check with a constant-time compare against a 32-byte hex token **defined as a `const` at the top of `index.ts`**.
- Token is generated fresh for this run, never written to the secrets store, never echoed in chat after the call, and disappears with the function file in step 4.
- Endpoint requires `x-ops-token: <embedded_token>`; missing/wrong header ⇒ 401.
- Otherwise identical to v2: snapshot refresh → regression → 3 video smokes → JSON verdict payload.
- Deploy via `supabase--deploy_edge_functions`.
- Call exactly once via `supabase--curl_edge_functions` with the header.

## 4. Verified cleanup (token dies with the function)
Run in this order, capture each response in the evidence file:
1. `supabase--delete_edge_functions(["ops-run-e2e-regression"])` → record response.
2. Delete the local files `supabase/functions/ops-run-e2e-regression/{index.ts,deno.json}` via `rm`.
3. **Probe:** `curl` `https://<ref>.supabase.co/functions/v1/ops-run-e2e-regression` with the (now-orphaned) token header → expect 404 / `FUNCTION_NOT_FOUND`. Record status + body.
4. **Probe:** `secrets--fetch_secrets` → confirm no `OPS_*` secret was ever added. Record listing.
5. If either probe shows the function still resolves, mark evidence `CLEANUP_FAILED` and downgrade chat verdict to `NO-GO — privileged endpoint still live`.

No secrets-store interaction at any point. Token only ever existed in (a) the deployed function bundle and (b) the single `x-ops-token` header value used to call it; both are gone after step 1.

## 5. Migration-track coordination
Add a `MIGRATION_COORDINATION` block to the evidence file and append a matching checklist line to `docs/VIDEO_ENCODING_RUNBOOK.md`:

> `welcome-intro.storage_path` is currently `vimeo/1096146284?h=e90b8e5dfc`. The Vimeo → Supabase Storage migration must (a) upload the source to `training-videos/welcome-intro.mp4`, (b) overwrite `storage_path` **only after** the upload succeeds, (c) keep the Vimeo reference in a recovery column until a signed URL plays end-to-end. Do not run the migration's bulk UPDATE without this guard or it will silently break `/welcome-video`.

No code-level guard added — procedural only.

## 6. Evidence & verdict
Write `docs/audit/2026-07/evidence/e2e_run_2026-06-16.md` containing:
- Pass-criteria table (section 2) with actual values.
- `pipeline_health_snapshot` before/after rows.
- `regression_runs` row id + run1/run2 summaries + signature hashes.
- Video smoke table.
- **Cleanup section**: delete responses, 404 probe, secrets listing.
- Migration-coordination note (section 5).

Append one line to `docs/audit/2026-07/PRE_CALL_SIGNOFF_2026-06-14.md` and post the same line in chat:
`2026-06-16 HH:MM UTC — <GO|NO-GO> — pipelines x/7, regression SHIPPABLE/det=<y|n>, video x/3, cleanup verified <yes|no>`

## Out of scope
- Vimeo → Storage migration itself.
- Schema changes beyond the one `video_assets` row (already done).
- Player code, RLS, auth changes.
- New persisted secrets.

## Technical notes
- Token generated with `crypto.getRandomValues(new Uint8Array(32))` → hex; lives only in the deploy bundle.
- Constant-time compare to avoid timing leaks (defense in depth; bundle is deleted within minutes regardless).
- Wall time ≈ 3–5 min including cleanup probes.
