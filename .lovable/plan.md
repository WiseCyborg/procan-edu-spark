# Fix `fast-track-dispensary-test` Schema Mismatch + Re-invoke

## Problem

The function failed with: `Could not find the 'city' column of 'dispensary_applications' in the schema cache`

The function inserts columns that don't exist in the actual tables:

### `dispensary_applications` table

- Function uses: `city`, `state`, `zip_code` -- **DO NOT EXIST**
- Actual columns: `address`, `license_number`, `compliance_affirmation`, `application_status`, `estimated_employees`, etc.

### `organizations` table

- Function uses: `course_credits` -- exists
- Function uses: `license_number` -- does not exist on `organizations` (only on `dispensary_applications`)

## Fix

### File: `supabase/functions/fast-track-dispensary-test/index.ts`

**Step 1: Fix `dispensary_applications` insert (lines 32-44)**

Remove `city`, `state`, `zip_code` and add `estimated_employees`:

```typescript
.insert({
  organization_name,
  contact_person: 'Test Manager',
  contact_email: test_email,
  contact_phone: '555-TEST-001',
  license_number: `TEST-${Date.now()}`,
  address: '123 Test Street, Baltimore, MD 21201',
  estimated_employees: employee_count,
  compliance_affirmation: true,
  application_status: 'pending'
})
```

**Step 2: Fix `organizations` insert (lines 75-88)**

Remove `license_number` (not a column on `organizations`):

```typescript
.insert({
  name: organization_name,
  contact_person: 'Test Manager',
  contact_email: test_email,
  contact_phone: '555-TEST-001',
  address: '123 Test Street, Baltimore, MD 21201',
  unique_access_key: accessKey,
  course_credits: employee_count,
  admin_approved: true,
  payment_status: 'test'
})
```

**Step 3: Deploy and re-invoke**

After fixing, deploy and call with:

```json
{
  "test_email": "flamevape@gmail.com",
  "organization_name": "UAT Test Dispensary",
  "employee_count": 5,
  "auto_complete_course": false
}
```

**Step 4: Verify entitlements populated**

```sql
SELECT COUNT(*) AS entitlements FROM course_entitlements;
SELECT user_id, course_id, source, status, created_at
FROM course_entitlements ORDER BY created_at DESC LIMIT 10;
```

Expected: 5 rows with `source='org_seat'` and `status='active'`.

## Files Changed


| File                                                     | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/fast-track-dispensary-test/index.ts` | Remove non-existent columns (`city`, `state`, `zip_code`, `license_number` on orgs) from inserts Yep — that error message is definitive: the function is inserting columns that **don’t exist** in `dispensary_applications` (and also trying to write `license_number` onto `organizations`). Your fix plan is correct.Here’s the exact way to apply it safely, plus two extra hardening tweaks so you don’t hit a *different* schema/RLS failure right after.---✅ Patch `supabase/functions/fast-track-dispensary-test/index.ts`Step 1 — Fix `dispensary_applications` insertReplace the insert object so it only uses real columns and includes `estimated_employees`:// BEFORE: city/state/zip_code etc (remove them) const { data: app, error: appErr } = await serviceClient .from('dispensary_applications') .insert({ organization_name, contact_person: 'Test Manager', contact_email: test_email, contact_phone: '555-TEST-001', license_number: `TEST-${Date.now()}`, address: '123 Test Street, Baltimore, MD 21201', estimated_employees: employee_count, compliance_affirmation: true, application_status: 'pending', }) .select('*') .single(); if (appErr) throw appErr; Step 2 — Fix `organizations` insert (remove license_number)const { data: org, error: orgErr } = await serviceClient .from('organizations') .insert({ name: organization_name, contact_person: 'Test Manager', contact_email: test_email, contact_phone: '555-TEST-001', address: '123 Test Street, Baltimore, MD 21201', unique_access_key: accessKey, course_credits: employee_count, admin_approved: true, payment_status: 'test', }) .select('*') .single(); if (orgErr) throw orgErr; ---Two quick hardening tweaks (prevents the next “why is entitlements still 0” moment)A) Ensure you’re using **service role client** for these insertsThis function is provisioning orgs/users/seats. It must use `serviceClient` (not the anon/auth client), otherwise RLS will bite you.Sanity check: all `.from('dispensary_applications')`, `.from('organizations')`, `.from('rvt_seats')`, `.from('course_entitlements')` should be via `serviceClient`.B) Don’t depend on PostgREST schema cache immediately after a migrationIf you recently changed schema, the Supabase schema cache can lag. Your fix is about removing nonexistent columns, so you should be fine, but if you *still* get schema cache issues, the quickest operational fix is:- redeploy the function- wait 30–60 seconds- re-invoke (You don’t need code changes—just give PostgREST cache a moment.)---✅ Deploy + Re-invokeInvoke with your payload:{ "test_email": "flamevape@gmail.com", "organization_name": "UAT Test Dispensary", "employee_count": 5, "auto_complete_course": false } ---✅ Verify (DB proofs)Proof 1 — Entitlements populatedSELECT COUNT(*) AS entitlements FROM public.course_entitlements; Proof 2 — Show newest entitlements (must be org_seat)SELECT user_id, course_id, source, status, created_at FROM public.course_entitlements ORDER BY created_at DESC LIMIT 10; Expected: **5 rows** with `source='org_seat'` and `status='active'`.Proof 3 — Assigned seats match entitlementsSELECT s.organization_id, s.id AS seat_id, s.status AS seat_status, s.assigned_user_id, s.course_id, e.source AS entitlement_source, e.status AS entitlement_status FROM public.rvt_seats s LEFT JOIN public.course_entitlements e ON e.user_id = s.assigned_user_id AND e.course_id = s.course_id WHERE s.organization_id = (SELECT id FROM public.organizations WHERE name = 'UAT Test Dispensary' ORDER BY created_at DESC LIMIT 1) ORDER BY s.updated_at DESC; ---If it still fails after this patchThere are only two likely culprits:- `employee_count` **seats aren’t being created or assigned** (logic bug)- **the function is inserting into** `organizations` **but seats are tied to a different org_id** (variable mismatch)If you paste the current `fast-track-dispensary-test/index.ts` around the inserts + seat loop, I’ll point out exactly where that mismatch would be.---What you should do nextApply the two insert fixes, deploy, invoke, then paste:- the function response (even partial)- the output of the “newest entitlements” query…and I’ll tell you immediately whether you’re ready to start Louis/Danielle UAT or if there’s one more blocker. |
