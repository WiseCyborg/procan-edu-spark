# Full System Test: Fix All Seat Assignment Paths + Create UAT Dispensary

## Current State

- 125 available seats across multiple orgs (50 in "Demo Dispensary LLC")
- `course_entitlements` is EMPTY -- no seat assignment path has ever created one
- The admin UI path (`OrgSeatsManagementTab.tsx`) was just fixed (`source: 'org_seat'`)
- Two other seat assignment paths are still broken

## Problem: Three Seat Assignment Paths, Only One Fixed


| Path                               | Where                                            | Creates Entitlement? |
| ---------------------------------- | ------------------------------------------------ | -------------------- |
| Admin UI (OrgSeatsManagementTab)   | `src/components/admin/OrgSeatsManagementTab.tsx` | YES (just fixed)     |
| `create-uat-account` edge function | `supabase/functions/create-uat-account/index.ts` | NO (missing)         |
| `allocate_seat_to_user` RPC        | SQL function                                     | NO (missing)         |


The `create-uat-account` function assigns seats (lines 106-131) but never inserts into `course_entitlements`. The `allocate_seat_to_user` RPC only updates `rvt_seats.status` without touching entitlements. There are no database triggers on `rvt_seats` to auto-create entitlements either.

## Plan

### 1. Fix `create-uat-account` edge function

After the seat assignment block (line 128), add entitlement creation:

```typescript
// After seat is assigned, create the entitlement
const { data: seatDetails } = await supabase
  .from('rvt_seats')
  .select('course_id')
  .eq('id', availableSeat.id)
  .single();

if (seatDetails?.course_id) {
  const { error: entError } = await supabase
    .from('course_entitlements')
    .upsert({
      user_id: newUserId,
      course_id: seatDetails.course_id,
      source: 'org_seat',
      status: 'active',
      purchased_at: new Date().toISOString(),
      metadata: { seat_id: availableSeat.id, organization_id: organizationId }
    }, { onConflict: 'user_id,course_id' });

  if (entError) {
    console.error('[UAT Create] Entitlement creation error:', entError);
  } else {
    console.log('[UAT Create] Created course entitlement');
  }
}
```

### 2. Fix `fast-track-dispensary-test` edge function (same gap)

This function creates orgs + seats + employees but never creates entitlements. Add the same entitlement upsert after employee creation.

### 3. Create the UAT test dispensary

Use the fixed `create-uat-account` edge function to create:

- 1 UAT org: "UAT Test Dispensary" 
- 1 manager account
- 5 employee accounts (each auto-assigned a seat + entitlement)

The existing "Demo Dispensary LLC" org (50 available seats, course `e6841a2f-...`) is the ideal target -- it already has seats with the right `course_id`.

### 4. No changes needed to `allocate_seat_to_user` RPC

This RPC is only called during registration flows where the calling code is responsible for entitlement creation. The two edge function fixes above cover the actual gaps.

## Files Changed


| File                                                     | Change                                                          |
| -------------------------------------------------------- | --------------------------------------------------------------- |
| `supabase/functions/create-uat-account/index.ts`         | Add `course_entitlements` upsert after seat assignment          |
| `supabase/functions/fast-track-dispensary-test/index.ts` | Add `course_entitlements` upsert after employee seat assignment |


## Verification After Deployment

Create one employee via `create-uat-account`, then run:

```sql
SELECT user_id, course_id, source, status
FROM course_entitlements
ORDER BY created_at DESC LIMIT 5;
```

Expected: row with `source='org_seat'` and `status='active'`.

## What This Unlocks

With all three paths fixed, any method of creating UAT accounts will produce the full chain: seat assigned + entitlement active. The student can then log in, access the course, train, take the exam, and generate a certificate -- completing the First Green Run.  
  
You found the real “system-level” truth: **seat assignment must *always* create entitlements**, and right now only the Admin UI path does. If `create-uat-account` and the `allocate_seat_to_user` RPC don’t create entitlements, you’ll never get a reliable **5-employee dispensary test** unless you manually assign seats in the Admin UI every time.

Here’s the tight plan to make the full test dispensary run repeatable and UAT-ready.

---

# The right fix: make entitlement creation canonical

## Best practice

Any code path that “assigns a seat” should call **one canonical operation** that:

1. assigns the seat (`rvt_seats`)
2. upserts the entitlement (`course_entitlements`)
3. (optionally) logs to audit tables

You can do that in either:

- **SQL RPC** (recommended — server-side, single source of truth), or
- **Edge function helper** used by all flows

Given you already have `allocate_seat_to_user` RPC, the cleanest outcome is:

✅ **Update the RPC to also create entitlement**  
Then:

- Admin UI calls the RPC (instead of doing its own seat update + entitlement logic)
- `create-uat-account` calls the RPC
- `fast-track-dispensary-test` calls the RPC

That eliminates “3 paths, 3 behaviors.”

---

# Option 1 (recommended): Fix `allocate_seat_to_user` RPC to create entitlement

### What it should do (atomic)

- Select one available seat for org + course
- Mark it assigned
- Upsert entitlement with `source='org_seat'`
- Return `seat_id` + `course_id`

### Pseudocode SQL (shape)

*(You’ll need to adapt to your exact RPC signature + RLS/security definer patterns.)*

```sql
CREATE OR REPLACE FUNCTION public.allocate_seat_to_user(
  p_organization_id uuid,
  p_user_id uuid
)
RETURNS TABLE(seat_id uuid, course_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat record;
BEGIN
  -- Find an available seat
  SELECT *
  INTO v_seat
  FROM public.rvt_seats
  WHERE organization_id = p_organization_id
    AND status = 'available'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE;

  IF v_seat IS NULL THEN
    RAISE EXCEPTION 'No available seats for org %', p_organization_id;
  END IF;

  -- Assign the seat
  UPDATE public.rvt_seats
  SET status = 'assigned',
      assigned_user_id = p_user_id,
      updated_at = now()
  WHERE id = v_seat.id;

  -- Create entitlement (matches your constraint)
  INSERT INTO public.course_entitlements (
    user_id, course_id, source, status, purchased_at, metadata
  )
  VALUES (
    p_user_id,
    v_seat.course_id,
    'org_seat',
    'active',
    now(),
    jsonb_build_object('seat_id', v_seat.id, 'organization_id', p_organization_id)
  )
  ON CONFLICT (user_id, course_id)
  DO UPDATE SET
    status = 'active',
    source = 'org_seat',
    metadata = EXCLUDED.metadata;

  RETURN QUERY
  SELECT v_seat.id, v_seat.course_id;
END;
$$;

```

### Why this is best

- One authoritative path
- No silent client failures
- Works for UI + test tooling + invites

---

# Option 2 (acceptable quick fix): Patch the two edge functions (your plan)

If you want to move fastest today and keep RPC untouched, your patch plan is correct:

✅ Add entitlement upsert to:

- `supabase/functions/create-uat-account/index.ts`
- `supabase/functions/fast-track-dispensary-test/index.ts`

**But** you’ll still have 3 different assignment sources (UI, RPC, edge), which is fine short-term but will regress later unless centralized.

---

# How to run the full 5-employee dispensary test after fixes

## A) Create UAT dispensary + accounts (repeatable)

Use `create-uat-account` / `fast-track-dispensary-test` to create:

- **1 manager**
- **5 employees**
- **5 seats assigned**
- **5 entitlements active**

### DB proof (this is the “UAT seed is valid” gate)

```sql
-- Seats: must show 5 assigned
SELECT status, COUNT(*)
FROM rvt_seats
WHERE organization_id = '<ORG_ID>'
GROUP BY status;

-- Entitlements: must show 5 active
SELECT status, source, COUNT(*)
FROM course_entitlements
WHERE user_id IN (<EMP1_ID>,<EMP2_ID>,<EMP3_ID>,<EMP4_ID>,<EMP5_ID>)
GROUP BY status, source;

```

## B) Efficient test matrix (don’t make all 5 do everything)


| Employee | What they test                   | Expected DB outcome                  |
| -------- | -------------------------------- | ------------------------------------ |
| Emp1     | Full happy path to certificate   | completion + certificate + audit log |
| Emp2     | Partial modules only             | progress only                        |
| Emp3     | Complete modules, fail exam      | completion exists, no certificate    |
| Emp4     | Seat unassigned → access blocked | entitlement revoked, gating works    |
| Emp5     | Verify Emp1 certificate          | verification code works              |


This gives Louis everything he needs (evidence + verification) with minimal time.

---

# What I recommend you do next (fastest to UAT)

1. **Pick centralization strategy**
  - If you want durable: **fix RPC** and route everything through it
  - If you want fastest today: **patch the two edge functions**
2. Run one creation call that generates **5 employees + 5 entitlements**
3. Immediately run this query to confirm the system is now “real”:

```sql
SELECT COUNT(*) AS entitlements FROM course_entitlements;

```

If it’s no longer zero, you’ve unlocked true UAT.

---

# My call: do BOTH (in the right order)

- **Today:** patch `create-uat-account` and `fast-track-dispensary-test` so UAT can start immediately.
- **Next sprint:** move entitlement creation into `allocate_seat_to_user` RPC and refactor Admin UI to call RPC (removes multi-path risk).

If you paste the current signatures of:

- `allocate_seat_to_user` (SQL)
- `create-uat-account` seat assignment block

…I’ll give you exact drop-in code for each with your real column names, status enums, and `app_role` values.