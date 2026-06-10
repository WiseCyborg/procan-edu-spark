# Video Encoding Runbook

Target: keep Supabase Storage egress low while preserving acceptable quality for training videos.

## Encoding targets

| Setting | Value |
|---|---|
| Container | MP4 |
| Video codec | H.264 (High profile, level 4.0) |
| Resolution | 1920×1080 max (downscale 4K sources) |
| Frame rate | Match source, cap at 30 fps |
| Bitrate | ~1.5 Mbps average, 3 Mbps max |
| Keyframe interval | 2s |
| Audio codec | AAC-LC, 128 kbps, stereo, 48 kHz |
| Faststart | Yes (move moov atom to front) |

A 10-minute training video at these settings is ~110 MB. The 168 MB legacy file currently in `ProCannVideos` would compress to ~30 MB at the same visual quality.

## One-liner: ffmpeg

```bash
ffmpeg -i INPUT.mov \
  -c:v libx264 -profile:v high -level 4.0 -preset slow -crf 23 \
  -maxrate 3M -bufsize 6M -vf "scale='min(1920,iw)':-2" -r 30 \
  -c:a aac -b:a 128k -ac 2 -ar 48000 \
  -movflags +faststart \
  -y OUTPUT.mp4
```

For lower-motion talking-head content, raise `-crf` to 26 to shrink the file by another ~30%.

## Captions (recommended)

Generate a WebVTT sidecar named identically to the MP4:

```
welcome-intro.mp4
welcome-intro.vtt
```

Captions reduce playback abandonment and help with accessibility compliance.

## Naming convention

File name in `training-videos` bucket must match the `storage_path` column on the corresponding `video_assets` row. Default convention:

```
{asset_key}.mp4
```

Example: `welcome-intro.mp4` for the `welcome-intro` asset key. Use the admin Video Library page (`/admin/video-library`) to copy the exact path.

## Upload checklist

1. Encode using the ffmpeg command above.
2. Verify the output file is under 200 MB. If not, re-encode with a higher CRF.
3. Open Supabase dashboard → Storage → `training-videos`.
4. Upload to the path shown in the Video Library page (no leading slash).
5. Refresh the Video Library page — status should flip to "Ready".
6. Smoke-test by visiting the page that embeds `<SecureVideoPlayer assetKey="..." />`.

## Why this matters

The project hit Supabase's egress quota during the prior billing cycle. A single uncompressed 168 MB video served from a public bucket can burn through gigabytes of egress in a day. Re-encoding existing videos to the targets above, plus moving everything behind signed URLs (so search bots and unauthenticated hotlinks can't replay them), is the single biggest egress-reduction lever we have.
