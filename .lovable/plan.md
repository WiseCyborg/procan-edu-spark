
## Full Video Inventory + Reachability Report

I pulled every video reference from the DB and the frontend code, then probed each URL with both Vimeo's oEmbed API and a referer-stamped embed request from `procannedu.com`. Findings are below.

### Summary

| Bucket | Count | Status |
|---|---|---|
| ✅ Reachable (Vimeo 1073xxx batch) | 5 | Play correctly |
| ✅ Reachable (Supabase Storage MP4) | 1 | Orientation video |
| 🔴 **Unreachable from procannedu.com** (Vimeo 1096xxx batch) | **14** | oEmbed 404 / embed 403 |
| 🔴 **NULL / not configured** | 5 RVT modules + 1 welcome asset | No URL at all |
| ✅ Reachable (homepage hero on Vimeo page) | 1 | But **frontend ignores it** (see #3) |

### 1. Homepage / Welcome videos (3 surfaces)

| Surface | File | URL configured | Probe result |
|---|---|---|---|
| Landing `/` hero card | `src/pages/Index.tsx:127` → `WelcomeVideoSection` | `https://vimeo.com/1096146284/e90b8e5dfc` (passed as prop) | Page exists on vimeo.com (200), but **the prop is ignored** — see #3 |
| Logged-in `/welcome-video` page | `src/pages/WelcomeVideo.tsx` → `SecureVideoPlayer` | Reads `video_assets.welcome-intro` row | Row has `public_url = NULL`, `unmapped_reason = welcome_intro_shared_asset_2026-06-08` → **broken** |
| RVT Module 0 (orientation) | `course_modules` row | `https://zhmpwczrvitomsxjwpzc.supabase.co/storage/v1/object/public/ProCannVideos/ProCann Orientation Video.mp4` | **200 OK** ✅ |

**🔴 Bug:** `WelcomeVideoSection` has `videoUrl` marked "Legacy prop, retained for backwards compatibility — ignored." and always reads `assetKey='welcome-intro'` from `video_assets`. That row is empty, so the landing-page hero and the post-login welcome page both render an empty/poster-only player.

### 2. RVT course modules (Maryland RVT — course `e6841a2f…`)

24 modules total. Status:

| # | Title | URL | Probe |
|---|---|---|---|
| 0 | Welcome & Platform Orientation | Supabase Storage MP4 | ✅ 200 |
| 1 | Intro to MD Cannabis Laws | vimeo/1073070281 | ✅ 200 |
| 2 | Patient Rights and Privacy | vimeo/1096138533 | 🔴 404 (was reassigned today w/o evidence — see prior plan) |
| 3 | Product Knowledge & Safety | vimeo/1073072103 | ✅ 200 |
| 4 | Inventory Management | vimeo/1073072073 | ✅ 200 |
| 5 | Customer Service Excellence | vimeo/1096140061 | 🔴 404 |
| 6 | Security & Drug-Free Workplace | vimeo/1096134435 | 🔴 404 |
| 7 | Lab Testing & QC | vimeo/1096137849 | 🔴 404 |
| 8 | Dosage & Patient Consultation | vimeo/1073072091 | ✅ 200 |
| 9 | Point of Sale | **NULL** | 🔴 awaiting Vimeo ID |
| 10 | Drug Interactions | vimeo/1096133759 | 🔴 404 |
| 11 | Cultivation Basics | **NULL** | 🔴 awaiting |
| 12 | Packaging / Diversion | vimeo/1096135200 | 🔴 404 |
| 13 | Cash & Banking | vimeo/1096134152 | 🔴 404 |
| 14 | Age Verification | **NULL** | 🔴 awaiting |
| 15 | SOPs & Record Keeping | vimeo/1073072061 | ✅ 200 |
| 16 | Transportation & Delivery | vimeo/1096136076 | 🔴 404 |
| 17 | Waste Disposal | vimeo/1096136520 | 🔴 404 |
| 18 | Final Review | vimeo/1096145464 | 🔴 404 |
| 19 | Supervising Compliance | **NULL** | 🔴 awaiting |
| 20 | Compliance Oversight | vimeo/1096134709 | 🔴 404 |
| 21 | Team Training & Dev | vimeo/1096140061 (dup of #5) | 🔴 404 |
| 22 | Incident Documentation | vimeo/1096142296 | 🔴 404 |
| 23 | Advanced Diversion | vimeo/1096135626 | 🔴 404 |

### 3. Other course families

- **2 consumer courses** (`6839959e…` and `c1ba4f7f…`) — 14 modules total — all `video_url = NULL`, flagged `consumer_course_text_only`. By design.
- **video_assets table** — 20 rows. 18 reference Vimeo IDs (5 in 1073xxx are reachable; 13 in 1096xxx fail), 1 Supabase storage MP4 (reachable), 1 `welcome-intro` (NULL URL).

### 4. Hardcoded video URLs in code (not in DB)

`src/pages/TrainingHandbook.tsx` lines 183–315 hardcode five Vimeo iframes: 1073070281, 1073072061, 1073072073, 1073072091, 1073072103. **All 5 reachable.** ✅

### 5. Root cause of the 14 Vimeo 404s

The pattern is striking: every Vimeo ID in the `1073xxx` range works; every ID in the `1096xxx` range fails — including from a `Referer: https://procannedu.com/` embed request (returns **HTTP 403**, not 404). That means the videos most likely still exist on Vimeo but have **domain-restricted embed privacy** that does **not** include `procannedu.com` (or the privacy hashes saved in our DB are stale). It is not a code bug; it's a Vimeo account configuration issue on Louis's side.

Quick way to confirm: open `https://vimeo.com/manage/videos/1096146284/privacy` in the Vimeo dashboard and check "Where can this be embedded?" → add `procannedu.com` and `*.lovable.app`. If the hash there differs from what we stored, that's the other half of the problem.

### Recommended remediation (data + 1 small code fix; no schema changes)

**Plan only — nothing executed yet. Approve to switch to build mode.**

1. **Code fix (1 file):** `src/components/WelcomeVideoSection.tsx` — stop ignoring the `videoUrl` prop. When `videoUrl` is provided, render it directly; only fall back to `assetKey` lookup when it isn't. This unbreaks the landing-page hero immediately (its URL `1096146284` returns 200 on vimeo.com — only the embed needs the domain whitelisting in step 4).
2. **Data fix:** populate `video_assets.welcome-intro.public_url` so `/welcome-video` (post-login) also plays.
3. **Revert the unevidenced Module 2 reassignment** (per prior plan) so we don't ship the wrong video on Patient Rights.
4. **Human-side action for Louis (not a Lovable change):** in Vimeo dashboard, for every `1096xxx` ID listed above, set Privacy → "Hide from Vimeo" + "Specific domains" → add `procannedu.com`, `www.procannedu.com`, `*.lovable.app`. Confirm the privacy `?h=` hash matches what we have stored; if not, send the new hashes and I'll update the DB in one migration.
5. **Add a one-time reachability check** to the launch-readiness crawler so this regression is caught automatically next time (small addition to existing `launch-audit-crawler` edge function — probes each `video_url` via Vimeo oEmbed and flags non-200s in the audit report).

### Files I'd touch (if you approve)

- `src/components/WelcomeVideoSection.tsx` (1 component, ~10 lines)
- `supabase/functions/launch-audit-crawler/index.ts` (add video probe, ~30 lines)
- One SQL `UPDATE` migration / data fix for the `welcome-intro` row and Module 2 revert

### Files I'd NOT touch without Louis's input

- Any `course_modules.video_url` for the 14 broken Vimeo IDs — those need new hashes or new uploads from Louis. Guessing IDs would just create the same orphan problem we just untangled.

Tell me to proceed and I'll do steps 1, 3, and 5; step 2 needs you to either point to a Vimeo ID for `welcome-intro` or confirm it should reuse the storage MP4; step 4 is on Louis.
