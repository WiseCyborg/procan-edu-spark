## Goal
Replace Vimeo with self-hosted videos on Supabase Storage. Videos stream through an HTML5 player using short-lived signed URLs, only issued to users with valid enrollment/entitlement for that video's course.

## Architecture

```text
Browser (<video>)  ──▶  Edge Function: get-video-url  ──▶  Supabase Storage (private bucket)
                              │                                       │
                              ├─ verifies JWT (supabase.auth.getUser) │
                              ├─ looks up video_assets row            │
                              ├─ checks course_entitlements / public  │
                              └─ returns signed URL (10 min TTL)  ◀───┘
```

No video URLs are ever embedded in the page source. Each playback request is authorized server-side.

## Step 1 — Storage bucket
Create private bucket **`training-videos`** (50 MB → 5 GB per-file cap, MIME `video/*`) via `storage_create_bucket(public=false)`. The existing public `ProCannVideos` bucket stays untouched for now and can be migrated later.

## Step 2 — Database migration
Extend the existing `video_assets` table (no new table needed):
- Add `course_id uuid` (nullable — null means "any authenticated user can watch", used for the welcome video)
- Add `access_level text` enum-like column: `'public' | 'authenticated' | 'enrolled'` default `'enrolled'`
- Add `bucket_id text` default `'training-videos'`
- Add `mime_type text` default `'video/mp4'`
- Keep `storage_path`; `public_url` becomes optional (only used for `public` access_level)

RLS on `video_assets`: anyone authenticated can `SELECT` metadata (title, duration, thumbnail). Only admins can write.

RLS on `storage.objects` for bucket `training-videos`: **no direct client access**. Reads happen exclusively via signed URLs minted by the edge function (service role).

## Step 3 — Edge function `get-video-url`
Secure function (default `verify_jwt = true`):
1. `supabase.auth.getUser()` → 401 if no session.
2. Input: `{ assetKey: string }`.
3. Load `video_assets` row by `asset_key`; 404 if missing or `is_active=false`.
4. Authorization:
   - `access_level='public'` → allow.
   - `access_level='authenticated'` → allow (any signed-in user). Used for the welcome video.
   - `access_level='enrolled'` → check `course_entitlements` for `(user_id, course_id)` with valid status.
5. If allowed, mint a 600-second signed URL via service role: `storage.from(bucket).createSignedUrl(path, 600)`.
6. Return `{ url, expiresAt, title, duration }`. Logical denials return 200 + `{ success: false, error_code }` per project convention.

## Step 4 — Frontend: `<SecureVideoPlayer>`
New component `src/components/video/SecureVideoPlayer.tsx`:
- Props: `assetKey`, `title`, optional `onComplete`, `requiredWatchPercentage`.
- Uses TanStack Query to call the edge function; refreshes the URL ~30 s before expiry while playing.
- Renders native `<video controls playsInline>` with poster from `thumbnail_url`.
- Handles 4 states: loading, denied (clear message + link to enroll/purchase), error (retry), playing.
- Tracks `timeupdate` to compute watched %; calls `onComplete` at threshold — mirrors existing `VimeoPlayer` contract so it's a drop-in.

New hook `src/hooks/useSignedVideoUrl.ts` wrapping the edge function call with auto-refresh.

## Step 5 — Replace the broken Vimeo welcome video
- Seed one `video_assets` row with `asset_key='welcome-intro'`, `access_level='authenticated'`, `course_id=null`, empty `storage_path` (to be filled when uploaded).
- `src/components/WelcomeVideoSection.tsx` and `src/pages/WelcomeVideo.tsx`: swap the `<iframe>` for `<SecureVideoPlayer assetKey="welcome-intro" />`.
- Until you upload the new MP4, the player shows a clean "Video coming soon" placeholder instead of Vimeo's "unavailable" frame.

Existing course `VimeoPlayer` is **not** touched in this pass — the 5 Training Handbook videos still work on Vimeo. Migration of those is a follow-up once a new MP4 is ready for each.

## Step 6 — Admin upload (minimal)
Add `src/pages/admin/VideoAssetsAdmin.tsx` reachable from `/admin` → "Video Assets":
- Lists all `video_assets` rows.
- Upload form: pick file (≤2 GB, `video/mp4`), set title, access_level, course_id (when enrolled). Uploads via authed Supabase JS client (admin-only RLS write policy) to `training-videos/{uuid}/{filename}` and inserts the row.
- Replace / deactivate / delete actions.

This is the part that lets you avoid ever opening Vimeo again.

## Cost
Supabase Storage: $0.021/GB/month storage, $0.09/GB egress. Your $25 free monthly Cloud balance covers ~1 TB stored + ~270 GB streamed before any charge — effectively free at your current scale.

## Out of scope (call-outs)
- No HLS / adaptive bitrate. Single MP4 per video. Fine for desktop and decent mobile; weak 3G may buffer. If that becomes a problem we add Cloudflare Stream later behind the same component contract.
- No DRM, no watermarking. Signed URLs expire in 10 min but a determined viewer with the URL can re-share within that window. Standard for training video.
- No automatic transcoding. Upload the final MP4 (H.264 + AAC) you want served.
- The existing course `VimeoPlayer` stays in place for the 5 Training Handbook videos.

## Verification
1. As anonymous visitor on `/`, the welcome section shows the "Video coming soon" placeholder (or video if uploaded), never a Vimeo error.
2. As authenticated user, `<SecureVideoPlayer assetKey='welcome-intro'>` calls `get-video-url`, network shows a short-lived signed-URL response, `<video>` plays.
3. As unauthenticated user on a future enrolled video, edge function returns `{ success: false, error_code: 'not_authorized' }` and the player shows the enrollment CTA.
4. Manually expire the URL (wait 11 min) — auto-refresh keeps playback going.
