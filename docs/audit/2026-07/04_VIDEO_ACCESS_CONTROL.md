# Domain 4 — Video Access Control

## Architecture

```text
  React (<VideoPlayer>) ──► useSignedVideoUrl(assetKey)
                                │
                                ▼
              supabase.functions.invoke('get-video-url', { assetKey })
                                │  (Authorization: Bearer <user JWT>)
                                ▼
                       get-video-url Edge Function
                       1. auth.getUser(JWT)          → 401 if missing
                       2. SELECT video_assets WHERE asset_key=…
                       3. IF access_level='enrolled':
                            SELECT course_entitlements
                              WHERE user_id=auth.uid()
                                AND course_id=asset.course_id
                                AND status IN (active, granted, issued)
                            → 'not_authorized' if absent
                       4. supabase.storage.from(bucket)
                            .createSignedUrl(path, 600)   ← 10-minute TTL
                                │
                                ▼
                Signed Supabase Storage URL (HMAC-signed, time-boxed)
```

Source: `supabase/functions/get-video-url/index.ts` (143 lines, fully inlined in [`evidence/signed_video_url_tests.md`](evidence/signed_video_url_tests.md)).

Client refreshes ~30 s before expiry — see `src/hooks/useSignedVideoUrl.ts`.

## Key properties

| Property | Value |
|---|---|
| Signing method | Supabase Storage signed URL (HMAC over path + expiry, Supabase-managed key) |
| URL TTL | **600 seconds (10 min)** |
| Enrollment check | Server-side `course_entitlements` lookup keyed on `auth.uid()` — cannot be forged from the client |
| Public-bucket fast path | Only if `access_level='public'` AND `public_url` set (marketing previews) |
| Storage RLS | Private bucket, no public read; signed URLs are the only access path |
| URL portability across users | None — signed URL is keyed on path+expiry only, but enrollment check happens **before** URL is minted, so another user can't even request the same `assetKey` if they aren't enrolled |

## Audit doc test mapping

| # | Test | Expected | Result |
|---|---|---|---|
| 1 | Enroll student A in Course X | `course_entitlements` row inserted | ✅ |
| 2 | Do **not** enroll student B | (no row) | ✅ |
| 3 | Student A loads video, capture signed URL | 200 + URL + `expires_at` | ✅ |
| 4 | Student B re-uses A's signed URL | URL is HMAC-valid until expiry. **Note:** anyone with the raw URL string can stream until expiry, so the protection is the 10-min TTL + server-side enrollment gate that prevents B from minting the URL in the first place. Calling `get-video-url` as B → `not_authorized`. | ✅ for mint path; ⚠ raw URL is shareable for ≤10 min (intentional Supabase Storage behavior). |
| 5 | Student A uses URL within window | Plays | ✅ |
| 6 | Wait 11 min, retry expired URL | Storage returns 400/403 (`Token expired`) | ✅ |
| 7 | Direct file download | Streaming only; Storage URL serves the same MP4 bytes — protection is the TTL, not download-blocking | ⚠ acceptable per industry norm; documented |
| 8 | Edge function deploy status | `get-video-url` deploys cleanly, well under 50 MB limit | ✅ |

## Findings

| ID | Severity | Description | Recommendation |
|---|---|---|---|
| VIDEO-01 | Low | A signed URL captured by user A and shared with user B remains valid for up to 10 minutes — this is the documented behavior of Supabase Storage signed URLs. Mitigation is the short TTL. | Acceptable. Reduce TTL to 300 s if concerned. DRM is out of scope for July 1. |
| VIDEO-02 | Info | No `video_access_log` table — access events are not persisted. The audit doc asks for "Video access is logged". | Add lightweight insert into `user_activity_log` (`event_type='video_access'`) in the edge function before launch. |

## Success criteria

| Criterion | Status |
|---|---|
| Signed URLs are user-gated server-side | ✅ |
| URLs expire within defined window | ✅ 10 min |
| Expired URLs return explicit denial | ✅ |
| Edge function deploys to production | ✅ |
| Video access logged | ⚠ See VIDEO-02 |
