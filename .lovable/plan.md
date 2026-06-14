## Goal

Keep every video playable for Danielle and Louis (and all users) while the Vimeo → Supabase Storage migration is in flight. No videos move yet; this is a compatibility shim only.

## Current state (verified)

- **Course module videos** (`course_modules.video_url`) — Vimeo URLs like `https://vimeo.com/1073070281?h=...`. Rendered by `VideoPlayer` → `VimeoPlayer`. **Already works.** No change needed.
- **`video_assets` table** — 19 of 20 rows have `storage_path = 'vimeo/<id>'` (legacy refs); 1 row has an MP4 path; 1 row has `storage_path = NULL`. These are the future migration targets.
- **`SecureVideoPlayer`** — calls `get-video-url` edge function, which calls `storage.createSignedUrl()`. For any `vimeo/...` storage_path this fails with `signing_failed` because no file exists in the bucket. Used today on `WelcomeVideo` and `WelcomeVideoSection` (asset_key `welcome-intro`).

So the only break is the `SecureVideoPlayer` path when the asset hasn't been uploaded to Storage yet.

## Change

Make `get-video-url` + `SecureVideoPlayer` Vimeo-aware so they transparently fall back to a Vimeo embed when `storage_path` starts with `vimeo/`. No DB migration, no file moves.

### 1. Edge function `supabase/functions/get-video-url/index.ts`

Before the `createSignedUrl` block, add:

```ts
// Vimeo fallback — used while migration to Supabase Storage is in progress.
// storage_path format: "vimeo/<id>" or "vimeo/<id>?h=<hash>"
if (asset.storage_path.startsWith("vimeo/")) {
  const ref = asset.storage_path.slice("vimeo/".length);
  const [id, query] = ref.split("?");
  const hash = new URLSearchParams(query ?? "").get("h");
  return json({
    success: true,
    provider: "vimeo",
    vimeo_id: id,
    vimeo_hash: hash,
    expires_at: null,
    title: asset.title,
    thumbnail_url: asset.thumbnail_url,
    duration_seconds: asset.duration_seconds,
  });
}
```

All existing auth/entitlement checks above this block continue to gate access. `provider` defaults to `supabase` (omitted) for the existing signed-URL path so old responses stay shape-compatible.

### 2. Hook `src/hooks/useSignedVideoUrl.ts`

Extend `SignedVideoResponse` with optional `provider`, `vimeo_id`, `vimeo_hash` fields. No logic change.

### 3. `src/components/video/SecureVideoPlayer.tsx`

When `data.success && data.provider === "vimeo"`, render the same Vimeo iframe used by `VimeoPlayer` (badge=0, autopause=0). Keep the lazy-play overlay, loading state, and all denial states (`not_authorized`, `not_authenticated`, `not_found`) untouched. Drop the `not_uploaded` "coming soon" copy for assets that still have a `vimeo/...` path — they'll now play.

`onComplete` for the Vimeo branch fires when the iframe's `ended` event arrives via `@vimeo/player` (already a dependency, used by `VimeoPlayer`).

### 4. Admin label

In `src/pages/admin/VideoLibrary.tsx`, change the `vimeo/` row label from `"Legacy Vimeo ref"` / warn tone to `"Playing via Vimeo (migration pending)"` / ok tone, so the admin view reflects that these are functional, not broken.

## Out of scope

- Actual file uploads to `training-videos` bucket
- Touching `course_modules.video_url` rows (already working)
- Migration plan, encoding, or cutover sequencing — that's the post-call track

## Verification

1. `bun run build` exits 0.
2. Curl `get-video-url` with `assetKey: "welcome-intro"` as a signed-in user → response has `success: true, provider: "vimeo", vimeo_id: "..."`.
3. Load `/welcome-video` in the preview → Vimeo player renders and plays.
4. Pick one `video_assets` row with `storage_path = NULL` → still returns `not_uploaded` (unchanged).
5. Pick the orientation row with the real MP4 path → still returns a signed URL (unchanged).

## Files touched

- `supabase/functions/get-video-url/index.ts` (edit)
- `src/hooks/useSignedVideoUrl.ts` (edit — type only)
- `src/components/video/SecureVideoPlayer.tsx` (edit — Vimeo branch)
- `src/pages/admin/VideoLibrary.tsx` (edit — status label only)
