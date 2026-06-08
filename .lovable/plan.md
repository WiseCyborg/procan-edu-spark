## Status snapshot + welcome-video fix

### Part A — Regulatory snapshot (read-only, no code changes)

Compile a one-page status report from the data already gathered:

**Data layer (DB row counts as of now):**
- `regulatory_content`: **8 rows**, last write 2025-12-16 — content seeded but stale (~6 months).
- `federal_regulation_tracking`: **3 rows**, last 2026-06-06 — Federal Regulation Scraper agent running.
- `compliance_alerts`: **63,779 rows**, last 2026-06-08 20:10 — dominated by 5-minute "canary" admin_alerts (noise, not real regs).
- `regulatory_updates`, `comar_versions`, `regulatory_change_notifications`, `content_review_queue`: **0 rows** — these surfaces are wired but empty.

**Agent layer (last 14 days):**
- `COMAR Compliance Monitor` — 13 successful runs, last 2026-06-08 08:00.
- `Federal Regulation Scraper` — 3 successful runs, last 2026-06-08 06:00.
- No failures, but no agent is writing into `regulatory_updates` / `comar_versions` / `regulatory_change_notifications` — that's why the change-alert UI looks empty.

**Edge functions deployed:** `monitor-comar-updates`, `populate-comar-content`, `analyze-regulatory-impact`, `check-comar-compliance`, `notify-regulatory-changes`, `scrape-federal-regulations`, `scrape-regulations`, `generate-mca-audit-report` — all present.

**UI surfaces:** `/regulatory-explorer` (RegulatoryExplorer + RegulatorySidebar), `RegulationChangeAlert`, `LiveCOMARBadge`, `COMARStatus`, `COMARBanner`, `ContentReviewDashboard`, `ComplianceContentReviewPage`.

**Bottom line:** plumbing is live, agents are green, but the COMAR/MCA write path into `regulatory_updates` + `comar_versions` is silent — explorer and change-alert components have nothing fresh to show. No code change in this pass; deliverable is the written status with a recommended next step (re-run `populate-comar-content` + verify `monitor-comar-updates` insert path).

### Part B — Fix `/welcome-video` Vimeo embed

**Root cause (confirmed by `rg`):** `src/pages/WelcomeVideo.tsx` line 89 embeds
```
https://player.vimeo.com/video/1050355764?badge=0&autopause=0&player_id=0&app_id=58479
```
Every other Vimeo embed in the project that works (TrainingHandbook lines 183/216/249/282/315, VimeoPlayer, SCORMStylePlayer) passes a `h=<hash>` parameter. Vimeo videos with privacy = "unlisted / hide from vimeo.com" return "Sorry, we couldn't find that page" when the hash is missing — that matches "video link not working."

**Fix:** one-line edit to add the privacy hash. Need the hash from you (it's the segment after the numeric ID in the share URL, e.g. `vimeo.com/1050355764/ABCDEF1234`). Options:
1. You paste the full Vimeo share URL → I extract the hash and update the iframe `src`.
2. Or replace the welcome video with the same one used on the marketing home page (`vimeo.com/1096146284/e90b8e5dfc`, already known-good in `src/pages/Index.tsx`).

No other files need to change; `WelcomeVideoSection.tsx` already handles the `?h=` param correctly via its `getVimeoId` + `hashMatch` logic — only the hardcoded `/welcome-video` page is bare.

### Not in scope
- No DB writes, no migrations, no edge-function changes.
- No touching `TrainingHandbook` or course-module Vimeo embeds (those have hashes and work).
- No `compliance_alerts` purge (canary noise is a separate cleanup).

### Deliverable
1. The regulatory snapshot above as a chat message.
2. One file edit to `src/pages/WelcomeVideo.tsx` once you confirm option 1 (paste URL) or option 2 (reuse the Index video).