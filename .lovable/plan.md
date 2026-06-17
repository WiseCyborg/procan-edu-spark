# Launch Leverage Plan — Connector-Driven UAT & Readiness (Phase 1)

## Inputs received
- **Preview URL + token** — captured; will be stored as runtime secret `LOVABLE_PREVIEW_URL` (full tokenized URL) so Firecrawl can crawl gated preview routes without leaking the token into client code or git. Token expires ~2026-08-17, so we'll add a "refresh preview token" admin action.
- **Supabase** — project `zhmpwczrvitomsxjwpzc`, already wired.
- **Teams target — needs clarification.** The link you pasted is a **Teams *meeting chat*** (`19:meeting_...@thread.v2`), not a standard channel in a team. Graph API `POST /teams/{teamId}/channels/{channelId}/messages` only works against a **Team → Channel** (Microsoft 365 / work account), not a personal Teams chat or meeting thread. See "Open Questions" below.

---

## Phase 1 Build

### 1.1 Storage + secrets
- Secret: `LOVABLE_PREVIEW_URL` (full tokenized preview URL) — added via `secrets--add_secret`.
- Secret: `TEAMS_TEAM_ID`, `TEAMS_CHANNEL_ID` — only after you confirm the Teams target.
- Storage bucket: `launch-audit` (private), admin-only signed URL access.

### 1.2 Database (one migration)
- Table `public.launch_audit_runs`: `run_id uuid PK`, `route text`, `status text`, `screenshot_path text`, `markdown_excerpt text`, `findings jsonb`, `triggered_by uuid`, `created_at`.
  - GRANT to `authenticated` + `service_role`; RLS: admin-only via `has_role(auth.uid(), 'admin')`.
- View `public.v_launch_readiness` (admin-gated RPC wrapper `get_launch_readiness()`):
  - `unmapped_modules`, `duplicate_video_urls`, `orphan_video_assets`, `welcome_intro_resolved`, `hardcoded_iframe_count`, `i18n_lang_count`.

### 1.3 Edge functions (3)
- **`launch-audit-crawler`** (JWT-guarded, admin-only via `has_role`):
  - Reads `LOVABLE_PREVIEW_URL`, appends route paths (`/`, `/auth`, `/dashboard`, `/courses`, `/admin`, sample `/course/<slug>/module/1`).
  - Calls Firecrawl v2 `/scrape` per route with `formats: ['markdown','screenshot','links']`.
  - Runs heuristic checks (header overflow class, password eye-icon toggle, Vimeo iframe presence, module count vs DB, i18n switcher).
  - Writes screenshots to `launch-audit` bucket, row per route into `launch_audit_runs`.
- **`launch-readiness-snapshot`** (JWT-guarded admin): returns `get_launch_readiness()` JSON.
- **`post-readiness-update`** (JWT-guarded admin): posts Adaptive Card to Teams via `microsoft_teams` gateway. **Blocked until Teams target resolved.**

### 1.4 Admin UI — `/admin/launch-readiness`
- Traffic-light board sourced from `launch-readiness-snapshot`.
- "Run Firecrawl audit" button → invokes `launch-audit-crawler`.
- Table of last 10 runs with screenshot thumbnails (signed URLs) + findings JSON.
- "Post status to Teams" button (disabled until Teams configured).
- "Refresh preview token" field to update `LOVABLE_PREVIEW_URL` when it expires.

### 1.5 Out of scope for Phase 1
- Scheduled cron crawls (defer to Phase 3).
- Modifying video pipeline, i18n, or chatbot (observational only).

---

## Technical Section

**Connectors required (verify before build):**
- `firecrawl` — should be linked; will confirm with `standard_connectors--list_connections`.
- `microsoft_teams` — pending target confirmation.

**Files to create:**
- `supabase/migrations/<ts>_launch_audit.sql`
- `supabase/functions/launch-audit-crawler/{index.ts,deno.json}` (+ `config.toml` entry, `verify_jwt = true`)
- `supabase/functions/launch-readiness-snapshot/index.ts`
- `supabase/functions/post-readiness-update/index.ts`
- `src/pages/admin/LaunchReadiness.tsx`
- `src/hooks/useLaunchReadiness.ts`
- Route addition in admin router

**Security:**
- All three functions validate `supabase.auth.getUser()` then `has_role(uid, 'admin')` — pattern from `mem://security/edge-function-authorization-hardening`.
- Preview token kept server-side only; never sent to browser.
- Screenshot bucket private; signed URLs minted by edge function for admin UI.

---

## Open Questions (blocking)

1. **Teams target — the URL you pasted is a meeting chat, not a Team channel.** Graph API channel-messages only works for a Microsoft 365 Team → Channel (work/school account). Three options:
   - **(a)** You give me a real Team + Channel (Teams → channel → ⋯ → "Get link to channel" → I'll extract `teamId` + `channelId`).
   - **(b)** Skip Teams; surface readiness only in the in-app admin dashboard.
   - **(c)** Use a different channel (Slack, email digest via Resend) — say the word and I'll swap the connector.

2. **Preview token expiry (~2026-08-17):** OK to surface a "rotate token" input in the admin dashboard, or do you want it injected only via Workspace Settings?

3. **Routes to crawl:** the default list above (`/`, `/auth`, `/dashboard`, `/courses`, `/admin`, one course module) — add/remove any?

Once you answer #1 (and ideally #2, #3) I'll switch to build mode and ship the migration + 3 edge functions + admin page in one pass.
