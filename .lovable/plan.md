# Interim Plan — Status

Executed while waiting on Friday's Supabase plan upgrade. Once the spend cap is disabled, `get-video-url` can be redeployed and the player goes live with zero additional code changes.

## Completed

1. **Polished `SecureVideoPlayer`** — refined the "coming soon" copy so users understand the video is being migrated, not broken.
2. **Branded welcome poster** — generated `src/assets/welcome-video-poster.jpg` and wired it into `WelcomeVideoSection`. Replaces the blank gradient with a branded thumbnail.
3. **Admin Video Library** at `/admin/video-library` — read-only inventory of every `video_assets` row, showing asset key, title, access level, storage path, and live upload status (cross-checked against the `training-videos` bucket).
4. **Egress audit** — `docs/EGRESS_AUDIT_2026-06.md`. Found the culprit: a single 168 MB MP4 in the public `ProCannVideos` bucket. Re-encoding + moving to private bucket should drop video egress ~95%.
5. **Encoding runbook** — `docs/VIDEO_ENCODING_RUNBOOK.md`. ffmpeg one-liner, target bitrate, naming convention, caption format.
6. **Cleaned `supabase/config.toml`** — removed 12 stale `[functions.*]` blocks for functions that were deleted last session.

## Skipped (consciously)

- **Pre-creating the `training-videos` bucket via SQL** — `storage.buckets` rejects direct INSERT, and the edge function already lazy-creates the bucket on first call. Zero benefit to pre-staging.
- **Broad `loading="lazy"` sweep on landing-page images** — the audit shows images are not the egress problem. Saved for a future targeted pass if needed.

## Friday — flip the switch

1. Disable spend cap (or upgrade plan) in Supabase dashboard.
2. Redeploy `get-video-url`.
3. Re-encode the legacy 168 MB MP4 per `docs/VIDEO_ENCODING_RUNBOOK.md`.
4. Upload to `training-videos/welcome-intro.mp4` (or whichever asset row is being shipped first).
5. Watch the Video Library status flip to "Ready".
6. Smoke-test `/welcome-video`.
