# Fix Vimeo "This video isn't available" on Welcome screen

## Root cause

The Welcome video player is already wired correctly:
- `video_assets.welcome-intro` → `storage_path = "vimeo/1096146284?h=e90b8e5dfc"`, `access_level = 'public'`
- `get-video-url` returns `{ provider: 'vimeo', vimeo_id: '1096146284', vimeo_hash: 'e90b8e5dfc' }`
- `SecureVideoPlayer` embeds `https://player.vimeo.com/video/1096146284?h=e90b8e5dfc&...`

The error message "This video isn't available. The owner has been notified." is rendered **inside the Vimeo iframe**, not by our app. Vimeo loaded, identified the video, and then refused playback. That only happens for one of three reasons, all controlled in the Vimeo dashboard — not in code:

1. **Privacy → Embed** is set to "Specific domains" and `procannedu.com` / `lovableproject.com` / `lovable.app` are not on the allowlist.
2. **Privacy → Who can watch** is set to "Only people with a private link" but the unlisted/private hash (`h=...`) is wrong or has been rotated.
3. **Distribution** is restricted (region block, password) or the video is still transcoding / was removed.

The URL you shared (`https://vimeo.com/1096146284?fl=ip&fe=ec`) has no `h=` parameter, which suggests the canonical share link does not require a hash — so the stored hash `e90b8e5dfc` may now be stale, OR the embed domain allowlist is the blocker.

## Plan

### Step 1 — Vimeo dashboard fixes (you do this, no code)

In Vimeo → Manage Videos → "Welcome Intro" (id `1096146284`) → **Privacy**:

- **Where can this be embedded?** → either "Anywhere" OR "Specific domains" with these added:
  - `procannedu.com`
  - `www.procannedu.com`
  - `procannedu.lovable.app`
  - `lovableproject.com`
  - `lovable.app`
- **Who can watch?** → "Anyone" (or "Only people with the private link" + confirm the current unlisted hash).
- Confirm the video status is "Ready" (not still transcoding) and not region-blocked.

Then copy the current embed code from Vimeo's "Embed" panel and paste the `h=...` value into the next step.

### Step 2 — Sync the stored hash (one DB update)

Update `video_assets.welcome-intro.storage_path` to match whatever Vimeo currently shows in the embed snippet:

```
storage_path = 'vimeo/1096146284?h=<current-hash-from-vimeo>'
```

If Vimeo's privacy is set to "Anyone" with no hash required, store just `'vimeo/1096146284'`.

### Step 3 — Add a true fallback so this never blocks users again

Today the only "fallback" is Vimeo itself, so if Vimeo blocks playback there is nothing to fall back to. Add a real backup:

- Upload the same MP4 to the existing `secure-videos` Supabase Storage bucket as `welcome-intro/welcome-intro.mp4`.
- Add a new column `fallback_storage_path text` to `video_assets` and set it for `welcome-intro`.
- `get-video-url` returns both `vimeo_*` fields and a signed `fallback_url` (60-min signed URL from the bucket) for public assets.
- `SecureVideoPlayer` listens for the Vimeo Player `error` event (or a 6s "no `loaded` event" timeout) and swaps the iframe for a native `<video src={fallback_url} controls>` element.

### Step 4 — Verify

- Logged out, hard reload `/`, confirm the Vimeo iframe plays.
- Temporarily break the hash in the DB to simulate a Vimeo failure and confirm the native `<video>` fallback appears.
- Restore the correct hash.

## Files / surfaces touched in Step 3

- DB: `ALTER TABLE public.video_assets ADD COLUMN fallback_storage_path text;` + one row update.
- `supabase/functions/get-video-url/index.ts` — sign `fallback_storage_path` from `secure-videos` bucket and include in response.
- `src/hooks/useSignedVideoUrl.ts` — surface `fallback_url`.
- `src/components/video/SecureVideoPlayer.tsx` — Vimeo `error` / load-timeout handler that switches to `<video>` with the signed URL.

## Out of scope

- Changing the Vimeo video id, captions, poster image, or Welcome page copy.
- Touching other `video_assets` rows or non-welcome players.

## What I need from you to proceed

Either:
- **(A)** Confirm "go ahead with all 3 steps" and tell me the current embed hash from the Vimeo dashboard (or "no hash, set to Anyone"), and I'll do Steps 2 + 3, OR
- **(B)** "Just do Step 3 (storage fallback) now" — I'll add the backup path so even a misconfigured Vimeo asset still plays, and you can fix Vimeo privacy on your own time.
