# First Green Run: Fix Entitlement Source Constraint + Remove Stale Profiles Query

## Current State (DB Proofs Summary)


| Table                  | Status                                                      |
| ---------------------- | ----------------------------------------------------------- |
| rvt_seats              | 125 available, 0 assigned, all have course_id + purchase_id |
| course_entitlements    | EMPTY (pipeline never completed)                            |
| user_progress          | 10 rows for admin user only                                 |
| course_completions     | EMPTY                                                       |
| certificates           | 1 skeleton (pdf_url = null)                                 |
| user_certificates      | EMPTY                                                       |
| unified_audit_timeline | Active but no certificate events                            |


## Blocker Found

The admin seat assignment UI in `OrgSeatsManagementTab.tsx` (line 115) inserts `source: 'seat_allocation'` into `course_entitlements`, but the database has a CHECK constraint that only allows: `'stripe', 'org_seat', 'admin_grant', 'promo_code'`.

This means every seat assignment silently fails to create the entitlement -- the seat gets marked "assigned" but the entitlement row never appears. This is why `course_entitlements` is empty.

## Fix (1 file change)

### `src/components/admin/OrgSeatsManagementTab.tsx`

Change `source: 'seat_allocation'` to `source: 'org_seat'` on line 115. This matches the DB constraint and is semantically correct (the entitlement comes from an organizational seat allocation).

```typescript
// BEFORE (line 115):
source: 'seat_allocation',

// AFTER:
source: 'org_seat',
```

That is the only code change needed. The rest of the assignment logic (update seat status, fetch course_id, upsert entitlement) is correct.

## Verification After Fix

Once deployed, an admin can assign a seat in the UI, then confirm:

```sql
-- Entitlement should now exist
SELECT user_id, course_id, source, status
FROM course_entitlements
ORDER BY created_at DESC LIMIT 5;
```

Expected: row with `source = 'org_seat'` and `status = 'active'`.

## Note on the Second Assignment Path

The `SeatAssignmentManager.tsx` component uses `supabase.rpc('allocate_seat_to_user')` which is a server-side function -- its source value is controlled in SQL and likely already correct. This fix only affects the admin-side direct assignment in `OrgSeatsManagementTab`.  
  
Yes — that’s the real blocker, and it’s exactly the kind of thing that makes the system “look fine” while DB stays empty: **the entitlement upsert is failing due to the CHECK constraint on** `course_entitlements.source`.

## ✅ Do the 1-file fix (recommended)

In `src/components/admin/OrgSeatsManagementTab.tsx`, change:

- `source: 'seat_allocation'` → `source: 'org_seat'`

That will immediately allow the upsert to succeed under the existing constraint values (`'stripe','org_seat','admin_grant','promo_code'`).

### Patch snippet

```ts
await supabase.from('course_entitlements').upsert(
  {
    user_id: userId,
    course_id: seatData.course_id,
    source: 'org_seat', // ✅ must match DB constraint
    status: 'active',
    metadata: { seat_id: seatId, organization_id: organizationId },
  },
  { onConflict: 'user_id,course_id' }
);

```

### One more small but important improvement

Don’t let it fail “silently.” Capture and log the `upsert` error:

```ts
const { error: entError } = await supabase.from('course_entitlements').upsert(...);
if (entError) throw entError;

```

That way, if anything else is off (missing columns, enum mismatch), you’ll see it immediately.

---

## ✅ Alternative (not necessary for First Green Run): Expand the constraint

If you *want* to keep `seat_allocation` as the label, you can alter the CHECK constraint instead — but I agree with you: `org_seat` **is the correct semantic value** and matches the schema’s intent.

---

# After you deploy the 1-line fix: run this exact proof loop

## 1) Assign one seat in UI

Admin assigns seat to `e2e-emp1`.

## 2) DB proof (should now flip from empty → populated)

```sql
SELECT user_id, course_id, source, status, created_at
FROM course_entitlements
ORDER BY created_at DESC
LIMIT 5;

```

✅ Expected: a row appears with `source='org_seat'` and `status='active'`.

## 3) Confirm seat + entitlement are aligned

```sql
SELECT s.id AS seat_id, s.assigned_user_id, s.course_id, s.status,
       e.user_id, e.course_id, e.source, e.status AS entitlement_status
FROM rvt_seats s
LEFT JOIN course_entitlements e
  ON e.user_id = s.assigned_user_id
 AND e.course_id = s.course_id
WHERE s.status='assigned'
ORDER BY s.updated_at DESC
LIMIT 10;

```

✅ Expected: assigned seats have matching entitlement rows.

---

# Quick check on your “second seat assignment path”

You’re right: `SeatAssignmentManager.tsx` using `rpc('allocate_seat_to_user')` is likely already correct because the source is controlled in SQL. Once you fix the admin UI, you’ll have both paths working.

---

# What this unlocks (immediately)

Once `course_entitlements` populates, you can proceed to the next E2E gates:

1. Student can see course (entitlement gating works)
2. Completing modules writes `user_progress`
3. Completing required modules writes `course_completions`
4. Exam + generate certificate writes:
  - `certificates.pdf_url`
  - `user_certificates`
  - `certificate_audit_log`
  - `unified_audit_timeline` shows certificate events

---

## Next best move

Make that 1-line change + add the error check, deploy, then run the entitlement query above and paste the top 5 rows. That will tell us in one glance if the “First Green Run” is finally unblocked.