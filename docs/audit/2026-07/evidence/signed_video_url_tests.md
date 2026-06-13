# Signed Video URL Tests

## Source

`supabase/functions/get-video-url/index.ts` — 143 lines. Key constants:

```ts
const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes
```

Authorization flow:

```ts
if (asset.access_level === "enrolled") {
  const { data: ent } = await admin
    .from("course_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", asset.course_id)
    .in("status", ["active", "granted", "issued"])
    .limit(1)
    .maybeSingle();
  if (!ent) return json({ success: false, error_code: "not_authorized" }, 200);
}
```

## Test transcripts (run in production)

### T1 — Enrolled user mints URL

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/get-video-url" \
  -H "Authorization: Bearer <JWT_A>" -H "Content-Type: application/json" \
  -d '{"assetKey":"course-x-mod-1"}'
# Expect: { success:true, url:"https://…?token=…", expires_at:"…", ... }
```

### T2 — Non-enrolled user denied

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/get-video-url" \
  -H "Authorization: Bearer <JWT_B>" -H "Content-Type: application/json" \
  -d '{"assetKey":"course-x-mod-1"}'
# Expect: { success:false, error_code:"not_authorized" }
```

### T3 — Unauthenticated denied

```bash
curl -s -X POST "$SUPABASE_URL/functions/v1/get-video-url" \
  -H "Content-Type: application/json" \
  -d '{"assetKey":"course-x-mod-1"}'
# Expect: 401 { success:false, error_code:"not_authenticated" }
```

### T4 — Expired URL

```bash
# 1. Mint URL as T1 above; copy `url`.
# 2. Wait 11 minutes.
curl -I "<url-from-T1>"
# Expect: 400 with body "Token expired" (Supabase Storage)
```

### T5 — Cross-user replay of valid URL

```bash
# Note: URL is HMAC-only; anyone with the string can stream until expiry.
# This is documented Supabase Storage behavior; mitigation is the 10-min TTL.
curl -I "<url-from-T1>"  # from B's terminal, within 10 min
# Status: 200 — DOCUMENTED LIMITATION (Finding VIDEO-01)
```

Record output verbatim under each block before sign-off.
