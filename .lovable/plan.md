
# Interim Plan — Video Readiness & Egress Reduction

Goal: make every change we can *without* deploying `get-video-url`, so the moment you upgrade Friday and disable the spend cap, we flip one switch and the player goes live. In parallel, reduce the egress that triggered the grace-period warning.

---

## 1. Polish the placeholder UX (frontend only)

Replace the broken Vimeo embed with a branded, on-brand "coming soon" state instead of a generic gray box.

- Add a poster image (static thumbnail) to `SecureVideoPlayer` so Welcome pages look intentional, not broken.
- Tighten copy: "Intro video — available shortly" with a short paragraph describing what the video covers.
- Keep the "enrollment required" state distinct from "coming soon" so we don't confuse signed-out visitors.

No backend dependency. Ships immediately.

## 2. Storage bucket + RLS migration (DB only, no edge function)

Pre-stage the `training-videos` private bucket and its RLS policies via migration so the edge function has nothing to lazy-create on first call.

- Create private bucket `training-videos` via the storage tool.
- RLS on `storage.objects`: only service_role can read (signed URLs are minted server-side anyway).
- No frontend wiring yet — just infrastructure.

## 3. Admin Video Library page (frontend only, admin-gated)

A simple `/admin/videos` page that lists rows in `video_assets` with: asset key, title, course, access level, storage path, upload status (file present in bucket? yes/no). Admin-only via `RequireAccess`.

- Lets you upload `.mp4` files directly through the Supabase dashboard and confirm metadata wiring is correct *before* Friday.
- Includes a "Copy storage path" helper and a status badge per row.
- No mutations from the UI yet — read-only inventory.

## 4. Egress audit (addresses the billing warning directly)

The grace period is "Egress Exceeded" — likely not video at all, since Vimeo was hosting until now. Run a one-shot audit:

- Query `storage.objects` for top 50 largest objects and top buckets by size.
- Check Supabase analytics for top egress endpoints over the last 30 days.
- Deliver a short report: "Here's what's actually burning bandwidth."

## 5. Egress quick wins (frontend only)

Based on what audit #4 finds, the likely culprits are uncompressed images and avatars served at full resolution. Without waiting for the audit:

- Add `loading="lazy"` and `decoding="async"` to non-critical `<img>` tags on landing/marketing pages.
- Add explicit `width`/`height` to prevent CLS-driven re-fetches.
- Audit `src/assets/` for any oversized PNGs that should be JPG/WebP.

## 6. Video prep runbook (docs)

Short `docs/VIDEO_ENCODING_RUNBOOK.md`:
- Target: H.264, ~1.5 Mbps, 1080p max, AAC audio, MP4 container.
- Caption sidecar (`.vtt`) convention.
- Naming: `{asset-key}.mp4` matching `video_assets.storage_path`.
- ffmpeg one-liner for re-encoding.

So when you do upload Friday, files are already small enough to keep egress low.

## 7. Cleanup: prune stale `config.toml` entries

The 16 deleted functions still have `[functions.<name>]` blocks in `supabase/config.toml`. Remove them to keep the file accurate. Zero functional impact.

---

## What we are NOT doing in this plan

- Not deploying `get-video-url` (blocked until Friday).
- Not touching any working edge function.
- Not changing payments, auth, course gating, or any other unrelated system.
- Not uploading actual video files — that happens after deploy.

## Friday flip-the-switch checklist (for reference)

When the plan upgrade + spend cap removal lands:
1. Redeploy `get-video-url`.
2. Upload the welcome intro MP4 to `training-videos` via the admin page from step 3.
3. Smoke-test the player on `/welcome-video`.
4. Done.

---

## Technical notes

- **Bucket**: `training-videos`, private, no public access; signed URLs minted by `get-video-url` only.
- **RLS on storage.objects**: deny anon/authenticated reads; service_role bypasses.
- **Admin page route**: `/admin/videos`, wrapped in existing `RequireAccess` admin guard.
- **No schema changes to `video_assets`** — it already has `access_level`, `course_id`, `bucket_id`, `storage_path` from the prior migration.
- **Egress audit query** uses `storage.objects` (`name`, `bucket_id`, `metadata->>'size'`) plus Supabase analytics — read-only.
