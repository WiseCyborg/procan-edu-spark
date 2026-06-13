# RLS Negative-Access Test Transcripts

Run these as Levels in production using two real UAT accounts. Replace `<JWT_A>` / `<JWT_B>` / `<USER_B_UUID>`.

## Setup

```sql
-- As service_role, confirm two distinct users exist with entitlements
SELECT user_id, course_id FROM course_entitlements
WHERE user_id IN ('<USER_A_UUID>','<USER_B_UUID>');
```

## Test 1 — Cross-user entitlement read

```bash
curl -s "$SUPABASE_URL/rest/v1/course_entitlements?user_id=eq.<USER_B_UUID>" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer <JWT_A>"
# Expected: []
```

## Test 2 — Cross-user payments read

```bash
curl -s "$SUPABASE_URL/rest/v1/payments?user_id=eq.<USER_B_UUID>" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer <JWT_A>"
# Expected: []
```

## Test 3 — Anonymous

```bash
curl -s "$SUPABASE_URL/rest/v1/profiles?select=*" \
  -H "apikey: $ANON_KEY"
# Expected: [] or 401 — no anon GRANT on profiles
```

## Test 4 — Self-grant attempt

```bash
curl -X POST "$SUPABASE_URL/rest/v1/course_entitlements" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer <JWT_A>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_A_UUID>","course_id":"<COURSE_X>","status":"active","source":"admin_grant"}'
# Expected: 403 "new row violates row-level security policy" — only admin/manager/coordinator may insert.
```

## Test 5 — Append-only attestation

```bash
curl -X DELETE "$SUPABASE_URL/rest/v1/module_attestations?id=eq.<ATT_ID>" \
  -H "apikey: $ANON_KEY" \
  -H "Authorization: Bearer <JWT_A>"
# Expected: 0 rows affected — no DELETE policy exists for non-admins.
```

## Recording

Paste full responses (with status codes) inline beneath each test before sign-off.
