

# Fix 3 E2E Validation Failures

All three failures are in `supabase/functions/run-e2e-validation/index.ts` — the test data/expectations need updating, not the production code.

## Fix 1: Dispensary Application Submit (expired date)

**Root cause**: Line 421 has `licenseExpiryDate: '2026-01-15'` which is now in the past (today is 2026-03-19). The server-side Zod validation correctly rejects it.

**Fix**: Replace the hardcoded date with a dynamic future date:
```typescript
licenseExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
```

This also fixes the "DB Record Created" skip since it cascades from the submit failure.

## Fix 2: Webhook H1 — accept 400 status

**Root cause**: Line 1211 accepts `[200, 204, 401, 403, 405]` but the stripe-webhook returns 400 ("Missing stripe-signature header") which is a valid rejection proving the function exists.

**Fix**: Add 400 to accepted statuses:
```typescript
const ok = [200, 204, 400, 401, 403, 405].includes(r.status);
```

## Fix 3: Entitlement source constraint

**Root cause**: Lines 1256 and 1290 use `source: 'e2e_audit'` and `source: 'e2e_audit_dup'`, which violate the DB CHECK constraint that only allows `'stripe'`, `'org_seat'`, `'admin_grant'`, `'promo_code'`.

**Fix**: Change both to valid values:
- Line 1256: `source: 'admin_grant'`
- Line 1290: `source: 'admin_grant'` (duplicate test still works — it tests same user+course uniqueness, not source uniqueness)

## Files Changed

- `supabase/functions/run-e2e-validation/index.ts` — 3 line-level edits

## Verification

After deploying, re-invoke the `run-e2e-validation` function. Expected result: 46/46 passed, 0 blockers, SHIPPABLE.

