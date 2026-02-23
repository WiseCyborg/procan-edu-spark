# Fix UAT Seats + Organization Members

## Problem

The UAT GreenRun2 dispensary has 5 entitlements working correctly, but:

1. All 5 seats are still `status='available'` with no `assigned_user_id` -- admin seat roster looks wrong
2. No `organization_members` rows exist -- coordinator/manager dashboards will show empty

The SQL read-query tool cannot run write operations, so we need an edge function to perform these data fixes.

## Plan

### 1. Create a one-shot utility edge function

**File:** `supabase/functions/uat-fix-seats-members/index.ts`

This function will:

**A) Assign 5 available seats to the 5 employees:**

- Query `rvt_seats` for 5 available seats in org `511f5c69-...`
- Update each to `status='assigned'` with `assigned_user_id` set to the corresponding employee
- Note: `rvt_seats` has no `updated_at` column, so we skip that field

**B) Insert 6 `organization_members` rows:**

- Manager (`ed19e3c1-...`) with `member_type='manager'`, `role='dispensary_manager'`
- Emp1-5 with `member_type='employee'`, `role='employee'`
- Uses upsert on the unique constraint `(organization_id, email, role)` to be idempotent

The enum `member_type` allows: `employee`, `coordinator`, `manager`, `owner`.

### 2. Deploy and invoke

Deploy the function, invoke it once, verify the response shows no errors.

### 3. Verify with DB queries

**Seats:**

```sql
SELECT status, COUNT(*)
FROM rvt_seats
WHERE organization_id = '511f5c69-b0f8-455d-a4b7-1972f6c66a41'
GROUP BY status;
```

Expected: 5 assigned, 0 available

**Members:**

```sql
SELECT email, member_type, status
FROM organization_members
WHERE organization_id = '511f5c69-b0f8-455d-a4b7-1972f6c66a41'
ORDER BY created_at;
```

Expected: 6 rows (1 manager + 5 employees)

### 4. Clean up

Delete the utility edge function after successful execution -- it's a one-shot tool.

## Files Changed


| File                                                | Change                                                   |
| --------------------------------------------------- | -------------------------------------------------------- |
| `supabase/functions/uat-fix-seats-members/index.ts` | Create one-shot utility function (then delete after use) |


## Technical Details

- Seat IDs from DB: `52bdc470-...`, `f5c547cc-...`, `a4131f1d-...`, `d36d6434-...`, `80f5311c-...`
- Employee IDs: Emp1 `f167e515-...`, Emp2 `af0018c3-...`, Emp3 `cf9e8145-...`, Emp4 `37fc89ae-...`, Emp5 `a1ab4593-...`
- Manager ID: `ed19e3c1-45eb-476d-ae68-8f4baa30cc30`
- Org ID: `511f5c69-b0f8-455d-a4b7-1972f6c66a41`
- No `updated_at` column on `rvt_seats` (confirmed by schema error)
- Unique constraint on `organization_members`: `(organization_id, email, role)`  
  
`confirm with`   
  
Perfect call. If your current operator path can’t run writes, a **one-shot utility edge function** is exactly the right move — and we’ll make it **idempotent**, **safe**, and **self-reporting** so you can run it once and be done.
  Below is a production-ready `uat-fix-seats-members` edge function you can drop in, deploy, invoke, verify, then delete.
  ---
  ## 1) Create the edge function
  **Path:** `supabase/functions/uat-fix-seats-members/index.ts`
  ```ts
  // supabase/functions/uat-fix-seats-members/index.ts
  import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

  type MemberSeed = {
    user_id: string;
    email: string;
    role: 'dispensary_manager' | 'employee';
    member_type: 'manager' | 'employee';
  };

  serve(async (req) => {
    try {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
      const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
        return new Response(
          JSON.stringify({ ok: false, error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });

      // ---- Hard-coded UAT GreenRun2 references (one-shot tool) ----
      const ORG_ID = '511f5c69-b0f8-455d-a4b7-1972f6c66a41';
      const COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

      const members: MemberSeed[] = [
        {
          user_id: 'ed19e3c1-45eb-476d-ae68-8f4baa30cc30',
          email: 'uat-greenrun2+manager@procannedu.com',
          role: 'dispensary_manager',
          member_type: 'manager',
        },
        {
          user_id: 'f167e515-4fde-42a6-9fa6-77c227ffd495',
          email: 'uat-greenrun2+emp1@procannedu.com',
          role: 'employee',
          member_type: 'employee',
        },
        {
          user_id: 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5',
          email: 'uat-greenrun2+emp2@procannedu.com',
          role: 'employee',
          member_type: 'employee',
        },
        {
          user_id: 'cf9e8145-6fcb-40f8-91ea-9346d5b43b6c',
          email: 'uat-greenrun2+emp3@procannedu.com',
          role: 'employee',
          member_type: 'employee',
        },
        {
          user_id: '37fc89ae-7376-4457-b147-f0219e296f98',
          email: 'uat-greenrun2+emp4@procannedu.com',
          role: 'employee',
          member_type: 'employee',
        },
        {
          user_id: 'a1ab4593-1f5d-4644-aca8-c76c72b156e8',
          email: 'uat-greenrun2+emp5@procannedu.com',
          role: 'employee',
          member_type: 'employee',
        },
      ];

      // --------- 0) Optional payload guard (only allow POST) ----------
      if (req.method !== 'POST') {
        return new Response(JSON.stringify({ ok: false, error: 'Use POST' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // --------- 1) Assign seats (idempotent) ----------
      // Target: 5 seats should end up assigned to the 5 employees.
      // Strategy:
      // - For each employee, if they already have an assigned seat for this org/course, skip.
      // - Otherwise, grab one available seat and assign it.
      const employees = members.filter((m) => m.member_type === 'employee');

      // Pull current seat state for org/course
      const { data: seatRows, error: seatErr } = await service
        .from('rvt_seats')
        .select('id, status, assigned_user_id, organization_id, course_id')
        .eq('organization_id', ORG_ID)
        .eq('course_id', COURSE_ID);

      if (seatErr) throw seatErr;

      const seats = seatRows ?? [];
      const availableSeats = seats.filter((s) => s.status === 'available' && !s.assigned_user_id);

      const existingAssignments = new Map<string, string>(); // user_id -> seat_id
      for (const s of seats) {
        if (s.status === 'assigned' && s.assigned_user_id) {
          existingAssignments.set(String(s.assigned_user_id), String(s.id));
        }
      }

      const seatAssignments: Array<{ user_id: string; seat_id: string; action: string }> = [];

      for (const emp of employees) {
        const already = existingAssignments.get(emp.user_id);
        if (already) {
          seatAssignments.push({ user_id: emp.user_id, seat_id: already, action: 'already_assigned' });
          continue;
        }

        const nextSeat = availableSeats.shift();
        if (!nextSeat) {
          seatAssignments.push({ user_id: emp.user_id, seat_id: '', action: 'no_available_seat' });
          continue;
        }

        const { error: updErr } = await service
          .from('rvt_seats')
          .update({ status: 'assigned', assigned_user_id: emp.user_id })
          .eq('id', nextSeat.id)
          .eq('organization_id', ORG_ID)
          .eq('course_id', COURSE_ID);

        if (updErr) throw updErr;

        seatAssignments.push({ user_id: emp.user_id, seat_id: String(nextSeat.id), action: 'assigned_now' });
      }

      // --------- 2) Upsert organization_members (idempotent) ----------
      // Unique constraint: (organization_id, email, role)
      const memberRows = members.map((m) => ({
        organization_id: ORG_ID,
        user_id: m.user_id,
        email: m.email,
        role: m.role,
        status: 'active',
        member_type: m.member_type,
      }));

      const { data: memberUpserts, error: memberErr } = await service
        .from('organization_members')
        .upsert(memberRows, { onConflict: 'organization_id,email,role' })
        .select('organization_id, user_id, email, role, status, member_type');

      if (memberErr) throw memberErr;

      // --------- 3) Return a verification-ready summary ----------
      const { data: seatCounts, error: seatCountErr } = await service
        .from('rvt_seats')
        .select('status')
        .eq('organization_id', ORG_ID)
        .eq('course_id', COURSE_ID);

      if (seatCountErr) throw seatCountErr;

      const counts = (seatCounts ?? []).reduce(
        (acc: Record<string, number>, r: any) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      return new Response(
        JSON.stringify({
          ok: true,
          org_id: ORG_ID,
          course_id: COURSE_ID,
          seat_status_counts: counts,
          seat_assignments: seatAssignments,
          members_upserted: memberUpserts?.length ?? 0,
          members_preview: memberUpserts ?? [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: String(e) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  });

  ```
  ### Why this version is safe
  - **Idempotent seat assignment**: if an employee already has a seat assigned, it won’t reassign.
  - **Idempotent membership upsert**: uses your `(organization_id, email, role)` unique constraint.
  - **Hard-coded org/course/user IDs**: one-shot and cannot accidentally hit other orgs.
  - **No** `updated_at` used for `rvt_seats`.
  ---
  ## 2) Deploy it
  From your repo:
  ```bash
  supabase functions deploy uat-fix-seats-members

  ```
  ---
  ## 3) Invoke it (once)
  ### Curl
  ```bash
  curl -sS -X POST \
    -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    https://<PROJECT_REF>.functions.supabase.co/uat-fix-seats-members \
    -d '{}' | jq

  ```
  ✅ Expected response includes:
  - `seat_status_counts` showing `assigned: 5`
  - `members_upserted: 6`
  ---
  ## 4) Verify with your DB read queries
  ### Seats
  ```sql
  SELECT status, COUNT(*)
  FROM rvt_seats
  WHERE organization_id = '511f5c69-b0f8-455d-a4b7-1972f6c66a41'
  GROUP BY status;

  ```
  ### Members
  ```sql
  SELECT email, member_type, status
  FROM organization_members
  WHERE organization_id = '511f5c69-b0f8-455d-a4b7-1972f6c66a41'
  ORDER BY created_at;

  ```
  ---
  ## 5) Then proceed with Coordinator + Employee UAT
  Once seats + members are correct, your coordinator dashboard test will behave “clean” (no empty roster surprises), and you can start:
  - Create coordinator → request role → approve
  - Emp1 full training + exam + cert
  - Emp2 partial
  - Emp3 fail exam path
  - Emp4 revoke seat/entitlement
  - Emp5 verify cert
  ---
  ## 6) Cleanup (delete the utility function)
  After it runs successfully:
  ```bash
  supabase functions delete uat-fix-seats-members

  ```
  (or remove the folder + redeploy without it)
  ---
  If you paste the **invoke JSON response** from this function, I’ll tell you immediately whether you’re ready to start the coordinator workflow or if there’s a remaining seat/member mismatch to correct before Louis and Danielle click around.