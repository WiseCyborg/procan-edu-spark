# Launch Readiness — Honesty Pass

Goal: make the `/admin/launch-readiness` dashboard mean what it shows. Green = checks actually passed; not-checked is labeled, not implied passed.

## Scope

Four approved fixes plus the welcome-intro upgrade. Item (b) ships behind a flag until Louis's storage convention is confirmed; everything else lands in this pass.

## (a) Add `PREVIEW_AUDIT_URL` secret

Trigger `secrets--add_secret` for `PREVIEW_AUDIT_URL`. Value should be a fully-qualified preview URL (e.g. `https://id-preview--39cb473a-…lovable.app`), optionally with a `__lovable_token=...` query param so authenticated routes render. Without this the crawler returns `missing_config` — nothing else works.

## (b) Harden `unmapped_modules` — held pending storage convention

Once you confirm whether `course_modules.video_url` stores:
- a full URL (`https://player.vimeo.com/video/<id>`), or
- a bare numeric Vimeo id, or
- a mixed legacy format,

migration will rewrite the count in `get_launch_readiness()` to flag:
1. NULL / empty (current behavior)
2. Placeholder strings: `TBD`, `TODO`, `pending`, `n/a`, `-` (case-insensitive)
3. Format violations vs the confirmed convention (e.g. non-numeric where bare ids are required; non-Vimeo host where full URLs are required)
4. Optional: dangling references — `video_url` whose id is not present as an active `video_assets.vimeo_id`

Return shape will split the tile into `unmapped_modules` (total bad) and a `unmapped_breakdown` jsonb so the UI can show *why* each one failed. **No migration ships under this item until the convention is in hand.**

## (c) Real per-run rollup status

Today every run with HTTP 2xx is stored as `status='ok'` regardless of heuristic results. Change:

- Add `rollup_status text` (`pass` | `warn` | `fail`) and `failed_checks jsonb` to `launch_audit_runs`.
- In `launch-audit-crawler/index.ts`, after `analyze()`, compute rollup per route using a typed check registry:
  - `fail` if any required check is false (e.g. `has_header` on every route, `has_language_switcher` on every public route, `has_password_eye_icon` on `/auth`, `has_vimeo_iframe` on routes expected to embed video).
  - `warn` for informational findings (hardcoded iframe present on routes where it's unexpected).
  - `pass` only if all required checks pass and the route returned 2xx.
- Per-route expectations live in a `ROUTE_EXPECTATIONS` map at the top of the function, not scattered through `analyze()`, so blind spots are visible in one place.
- Batch-level rollup: a `launch_audit_batch_summary` view aggregates `pass/warn/fail` counts per `run_batch`. Dashboard "Last audit" stat tile turns red if any route is `fail`, amber if any `warn`.

## (d) Welcome-intro upgrade — actually resolve the asset

`get_launch_readiness()` stays for the DB-row check, but the authoritative answer moves to the crawler:

- New edge function step (in the same `launch-audit-crawler` run): read the active `video_assets` row for `asset_key='welcome-intro'`, resolve to a fetchable URL (prefer `public_url`; if `storage_path`, generate a signed URL via service role), then issue `HEAD` (fallback `GET` with `Range: bytes=0-1024` for hosts that reject HEAD).
- Store result in a new `welcome_intro_probe` jsonb on the batch summary: `{ resolved_url, method, http_status, content_type, latency_ms, ok }`.
- `welcome_intro_resolved` in the RPC return becomes a derived field: `db_row_present AND last_probe_ok` (falls back to `unknown` if no probe exists yet).
- UI tile shows three states: Green (probe 2xx + correct content-type), Amber (row exists, never probed), Red (row missing OR probe non-2xx) — with the probed URL and status visible on hover.

## (d-disclosures) Blind-spot labels in the UI

Add a "What this does **not** check" panel to `LaunchReadiness.tsx`, listed explicitly:
1. Visual layout / clipped CTAs — Firecrawl reads DOM only; a present-but-clipped "Get Started" passes every check. Recommended manual review using the captured screenshot.
2. Video playback — we verify the asset URL responds 2xx, not that the player renders or playback starts. Manual smoke test required.
3. Interactive behavior — language switcher, password-eye, modals, etc., are detected as text/markup presence only; we do not click.
4. Lazy-loaded content past the 1500ms `waitFor` window.

Each finding badge in the audit-runs list gets a tooltip with its plain-language pass/fail rule (the table from my previous answer), so reviewers don't have to read the edge-function source to know what green means.

## Technical details

```text
DB migration (single file):
  ALTER TABLE launch_audit_runs
    ADD COLUMN rollup_status text,
    ADD COLUMN failed_checks jsonb DEFAULT '[]'::jsonb;
  CREATE VIEW launch_audit_batch_summary AS
    SELECT run_batch, min(created_at) AS started_at,
           count(*) FILTER (WHERE rollup_status='pass')  AS pass_count,
           count(*) FILTER (WHERE rollup_status='warn')  AS warn_count,
           count(*) FILTER (WHERE rollup_status='fail')  AS fail_count,
           count(*) AS total
    FROM launch_audit_runs GROUP BY run_batch;
  GRANT SELECT ON launch_audit_batch_summary TO authenticated;
  -- get_launch_readiness(): add welcome_intro_probe + last_batch_rollup fields
  -- (unmapped_modules logic deferred to fix b)

Edge functions:
  launch-audit-crawler:
    + ROUTE_EXPECTATIONS map (required checks per route)
    + computeRollup(findings, expectations) -> {status, failed_checks}
    + welcomeIntroProbe() step (HEAD/GET with Range)
    + persist rollup_status, failed_checks, batch-level welcome_intro_probe
  launch-readiness-snapshot:
    + return last batch rollup + welcome_intro_probe alongside DB snapshot

Frontend (src/pages/admin/LaunchReadiness.tsx, src/hooks/useLaunchReadiness.ts):
  + Rollup pill on each audit-run card (pass/warn/fail) with failed_checks list
  + Welcome Intro tile shows probe URL + http_status + latency
  + "What this does NOT check" disclosures panel
  + Per-finding tooltip with plain-language rule
  + Empty-state CTA pointing at "Add PREVIEW_AUDIT_URL" when missing_config returns
```

No changes to UI styling beyond adding the rollup pill, probe details, and disclosure panel — keep it utilitarian, not polished.

## Order of operations

1. Trigger `secrets--add_secret(['PREVIEW_AUDIT_URL'])` (fix a).
2. Migration: rollup columns + batch summary view + RPC additions (fixes c, welcome-intro DB side).
3. Edge function updates: `launch-audit-crawler` rollup + welcome-intro probe; `launch-readiness-snapshot` returns the new fields.
4. Frontend updates: rollup pill, probe display, disclosures panel, finding tooltips.
5. Hand off: user runs an audit from `/admin/launch-readiness`; I read `launch_audit_runs` + `launch_audit_batch_summary` directly via SQL and report numbers back.
6. **Held**: fix (b) ships in a follow-up migration the moment Louis's `video_url` storage convention is confirmed.

## Out of scope (called out explicitly)

- No pixel/layout analysis of screenshots (clipped-CTA detection).
- No headless playback verification (we probe the URL, we don't play the video).
- No click-through of interactive elements.
- No changes to the homepage, `/auth`, or any user-facing surface.
