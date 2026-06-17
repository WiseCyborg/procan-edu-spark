## Goal
Allow anyone (signed in or not) to play the Welcome video on `/` via the existing Vimeo fallback (id `1096146284`, hash `e90b8e5dfc`). Today the player returns `not_authenticated` for logged-out visitors because `get-video-url` requires a Bearer token and the asset is `access_level='authenticated'`.

## Changes

### 1. DB — open the welcome asset to anonymous viewers
Migration:
```sql
UPDATE public.video_assets
SET access_level = 'public'
WHERE asset_key = 'welcome-intro';
```
No schema/RLS change — `video_assets` is already readable by the service-role client used inside the edge function.

### 2. Edge function `get-video-url` — allow unauth for public assets
- Stop short-circuiting on missing Authorization header.
- Load the asset first. If `access_level === 'public'`, skip `auth.getUser()` and return the Vimeo (or public_url) payload as today.
- For `authenticated` / `enrolled` assets, keep the existing flow: require a valid Bearer token, then run the enrollment check.
- For `enrolled` access, still resolve `userId` from `auth.getUser()` as today.

### 3. `supabase/config.toml`
Add:
```
[functions.get-video-url]
verify_jwt = false
```
The function still enforces auth internally for non-public assets, so security posture is unchanged for enrolled/authenticated content. This is the project's standard pattern for hybrid public/auth functions (per memory: "Edge Functions (Public): Must set verify_jwt = false … called via invokePublicFunction()").

### 4. Client — call via the public invoker when needed
- Update `src/hooks/useSignedVideoUrl.ts` to call the function through `invokePublicFunction('get-video-url', { assetKey })` from `src/lib/publicEdgeFunctions.ts`, which sends the anon key without requiring a user session. Authenticated users still get their JWT forwarded automatically by the helper (verify behavior of `invokePublicFunction`; if it does not forward the user session, fall back to `supabase.functions.invoke` when `supabase.auth.getSession()` returns a session, and `invokePublicFunction` otherwise).

### 5. Verification
- DB: `SELECT access_level FROM video_assets WHERE asset_key='welcome-intro'` returns `public`.
- Logged out: open `/` in an incognito preview → tap Welcome video → Vimeo iframe loads and plays.
- Logged in (existing user): same screen still plays; no regression for enrolled course videos (spot-check one `enrolled` asset still requires sign-in).
- Edge function logs show 200 for the unauth call.

## Out of scope
- No changes to the Vimeo id/hash (already correct in DB).
- No UI / copy changes on the Welcome section.
- No changes to other assets' access levels.

## Files touched
- `supabase/config.toml`
- `supabase/functions/get-video-url/index.ts`
- `src/hooks/useSignedVideoUrl.ts`
- One DB migration (single `UPDATE`)
