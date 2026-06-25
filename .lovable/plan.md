## Goal
Add the uploaded `section_6_–_health_considerations_v1 (1080p).mp4` to Supabase Storage and switch `section_6_health` to play directly from Supabase instead of Vimeo — proving out the "drop Vimeo" path for the rest later.

## What's in the DB today (relevant rows)
All 18 RVT section videos in `video_assets` currently use `storage_path = vimeo/<id>` and play through the Vimeo iframe. Only one asset (`orientation_video`) is already hosted in Supabase Storage (`ProCannVideos/...mp4`). None of the section videos have a `fallback_storage_path` set.

The existing `get-video-url` edge function already supports a Storage-hosted primary: when `storage_path` does NOT start with `vimeo/`, it mints a 10-minute signed URL from the `training-videos` bucket. So once a file is uploaded and the row is repointed, playback "just works" — no code changes required.

## Plan (build mode)

### 1. Upload the MP4 to Supabase Storage
- Bucket: `training-videos` (private, already used by `get-video-url`)
- Path: `rvt/section_6_health_v1_1080p.mp4`
- Uses the existing private bucket + signed-URL flow; no Vimeo embed-domain issues.

### 2. Repoint `video_assets.section_6_health` (one-row UPDATE)
- `storage_path` → `rvt/section_6_health_v1_1080p.mp4`
- `bucket_id` → `training-videos`
- `fallback_storage_path` → keep the current Vimeo ref as a safety net by moving it into `fallback_storage_path` (the edge function will sign a backup URL from there if the primary ever fails)
- `public_url` → null (private asset, signed only)

### 3. Verify
- Call `get-video-url` with `assetKey: "section_6_health"` as an enrolled user and confirm a `success: true` response with a Storage signed URL.
- Load the RVT Section 6 module in the preview and confirm the player plays from the signed Supabase URL (no Vimeo iframe).

### 4. Not in scope this turn
- Do **not** touch the other 17 Vimeo-hosted sections. Once Section 6 is confirmed playing from Storage, we can repeat the upload + repoint for each (one row each), but only after you green-light it and after the other section MP4s are uploaded. I'll flag the remaining list in the closing message.
- No edge function, schema, or frontend code changes — the existing player + `get-video-url` already handle the Storage path.

## Technical notes
- File goes to `/mnt/user-uploads/section_6_-_health_considerations_v1_1080p.mp4` → uploaded via Storage API into `training-videos/rvt/section_6_health_v1_1080p.mp4`.
- Update done via `supabase--insert` (data UPDATE, not a schema migration).
- `get-video-url` will lazy-create the bucket if missing and already allows `video/mp4`.
- Access stays `enrolled`, gated by `course_entitlements` on the RVT course — unchanged.
