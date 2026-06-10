# Egress Audit — June 2026

Triggered by the Supabase billing grace-period notice ("Egress Exceeded" in the prior cycle).

## Storage inventory snapshot

Run on 2026-06-10.

| Bucket | Files | Total size | Public? |
|---|---:|---:|---|
| `ProCannVideos` | 2 | **174 MB** | **Yes** |
| `profile-photos` | 2 | 1.4 MB | Yes |
| `compliance` | 0 | — | No |
| `conversation-files` | 0 | — | No |
| `mock-certificate-photos` | 0 | — | No |
| `call-recordings` | 0 | — | No |
| `regression-reports` | 0 | — | No |

Total stored: **~175 MB**. That's tiny — storage size is not the problem. Egress (bytes served per request × request count) is.

## Largest single objects

| Object | Size | Bucket |
|---|---:|---|
| `invideo-ai-1080-ProCann RVT Training_ Health Considerations-...mp4` | **168 MB** | `ProCannVideos` (public) |
| `ProCann Orientation Video.mp4` | 6.2 MB | `ProCannVideos` (public) |
| `<uuid>/avatar.jpeg` | 1.3 MB | `profile-photos` (public) |

## Root cause

The 168 MB MP4 in the **public** `ProCannVideos` bucket is the egress hog. Every page view that embeds or auto-plays it streams the full file, with no auth gate and no signed-URL throttling. A few hundred views = the entire monthly quota.

## Recommended fixes (priority order)

1. **Re-encode the 168 MB file** using `docs/VIDEO_ENCODING_RUNBOOK.md` — drops to ~30 MB at equivalent visible quality.
2. **Move it to the private `training-videos` bucket** behind the `get-video-url` edge function (signed URLs, 10-min TTL). Blocks bot scrapers and hotlinkers.
3. **Make `ProCannVideos` private** once nothing references it directly.
4. **Add `loading="lazy"`** to any `<img>` tags serving `profile-photos` outside the above-the-fold area.

Steps 1 and 2 together should reduce video-driven egress by **~95%** for the same number of views.

## What this audit did NOT find

- No oversized PDFs, JSON exports, or analytics dumps.
- No runaway edge function calls writing logs to storage.
- No unbounded avatar uploads (file_size_limit on `profile-photos` is 2 MB).

Egress is essentially a single-file problem. Fixing that one MP4 fixes the bill.
