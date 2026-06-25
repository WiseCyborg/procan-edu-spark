## Status

17 of 19 RVT videos are now uploaded to the **`ProCannVideos`** public bucket. The DB still points all of them at Vimeo. Missing files: **Section 12 (Transportation)** and **Section 18 (Ethics)** — flag for upload before we can claim 100%.

## Phase A — Repoint `video_assets` to Supabase Storage (data only, 1 migration)

For each of the 17 mapped rows, run an UPDATE:
- `bucket_id` → `'ProCannVideos'`
- `storage_path` → exact object name from the bucket (table above)
- `fallback_storage_path` → keep current `vimeo/<id>?h=<hash>` as a safety net
- `public_url` → `https://zhmpwczrvitomsxjwpzc.supabase.co/storage/v1/object/public/ProCannVideos/<URL-encoded path>` (since the bucket is public)
- `access_level` for the section videos stays `enrolled` so `get-video-url` still requires entitlement — but because the bucket is public, anyone with the URL can technically fetch the MP4. **Decision needed (see Q1).**

Sections 12 and 18 are left on Vimeo until their MP4s land.

`get-video-url` already handles non-`vimeo/` `storage_path` values: it mints a signed URL from `bucket_id`. Section 6 already runs this path. No code change required for `SecureVideoPlayer`.

## Phase B — Replace the parallel video pipeline (code, 4 files)

Three places in the app still bypass `video_assets` entirely, so flipping the DB has no effect on them:

1. **`src/pages/Index.tsx:127`** — hardcoded `https://vimeo.com/1096146284/e90b8e5dfc` for welcome-intro. Replace with `<WelcomeVideoSection />` (drop the `videoUrl` prop) so it resolves `welcome-intro` through `get-video-url`.
2. **`src/pages/TrainingHandbook.tsx` (5 `<iframe>`s)** — sections 1–5. Replace each with `<SecureVideoPlayer assetKey="section_{n}_..." />`.
3. **`course_modules.video_url`** (18 module rows render through `SCORMStylePlayer`/`VimeoPlayer`) — two options:
   - **B3a (smaller, recommended):** UPDATE `course_modules.video_url` to the public Storage URLs we set in Phase A. No refactor; existing players already accept arbitrary URLs. Sections 12 and 18 keep their Vimeo URL until upload.
   - **B3b (larger, deferred):** add `course_modules.video_asset_key` FK, refactor `EnhancedCourseModule.tsx` + `ConsumerCourse.tsx` to resolve via `video_assets`, null out `video_url`.

Recommend **B3a** now (single SQL UPDATE, zero refactor risk) and tee up B3b as a follow-up once Phase A is verified in production.

## Phase C — Verify

- Reload `/training-handbook` → all 5 section videos play from `ProCannVideos`.
- Reload `/courses/.../module/...` for sections 6, 7, 8 → players show Supabase URL in network panel, not `player.vimeo.com`.
- Reload `/` → welcome-intro plays from Supabase.
- Confirm `get-video-url` for `section_7_records` returns `provider: undefined, url: <signed Supabase URL>` for an enrolled user.
- Extend `launch-audit-crawler` count: "Videos on Supabase: 17 / 19" tile (the missing 2 are surfaced as a `not_uploaded`-equivalent warning).

## Phase D — Cleanup

- After Phase A lands and is verified, delete the orphaned admin upload helper: `supabase/functions/admin-storage-signed-upload` + the `UPLOAD_BOOTSTRAP_TOKEN_V2` secret + `training-videos/rvt/section_6_health_v1_1080p.mp4` (duplicate of the ProCannVideos copy).

## Questions before I build

1. **Bucket privacy.** `ProCannVideos` is **public** — anyone with the direct URL can download the MP4, bypassing entitlement checks. Three options:
   - **(i)** Accept it: enrolled-gated metadata in the app, public MP4s in storage. Fastest, matches how the orientation video already works.
   - **(ii)** Flip `ProCannVideos` to private and serve via `get-video-url` signed URLs (10-min TTL). Keeps the gate honest; requires every consumer to go through `get-video-url`.
   - **(iii)** Move only the enrolled assets to a private bucket (e.g. `training-videos`) and keep welcome-intro + orientation in `ProCannVideos`.

   My recommendation: **(ii)** — flip the bucket to private. The existing `get-video-url` already handles it, the section pages we touch in Phase B will route through it, and it preserves the "enrolled-only" promise. The trade-off is that `course_modules.video_url` (Phase B3a's UPDATE) can't be a raw public URL — we'd have to do B3b (refactor to `asset_key`) instead.

2. **Sections 12 and 18.** Upload now and include in this pass, or land 17/19 first and add the remaining two as a follow-up?

3. **Welcome-intro file size.** The candidate is 216 MB at 1080p. Comfortable serving that to every anonymous landing-page visitor, or want a 540p re-encode first?
