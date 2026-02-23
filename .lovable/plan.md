# RLS + Schema Fix — Unblock the First Green Run

## Problem

The 5 code fixes are deployed but will fail at runtime due to 2 RLS policy gaps and 1 schema cleanup issue. These must be fixed before any verification run.

---

## Fix A: Allow admins to INSERT/UPDATE `course_entitlements` (BLOCKER)

Currently only `service_role` can write. The admin seat assignment UI runs as `authenticated`. Need policies for admins (and coordinators who assign seats).

```sql
-- Allow admins and coordinators to manage entitlements
CREATE POLICY "Admins can manage entitlements"
ON public.course_entitlements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordinator', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'coordinator', 'manager')
  )
);
```

## Fix B: Allow users to UPDATE their own `course_completions` (BLOCKER)

The client-side upsert in `useUserProgress.tsx` can insert but cannot update on conflict without an UPDATE policy.

```sql
CREATE POLICY "Users can update their own completions"
ON public.course_completions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

## Fix C: Remove duplicate unique constraint (CLEANUP)

Two identical unique constraints exist on `(user_id, course_id)`. Remove the redundant one to avoid ambiguity.

```sql
ALTER TABLE public.course_completions
DROP CONSTRAINT IF EXISTS course_completions_user_id_course_id_key;
```

This keeps `course_completions_user_course_unique` as the canonical constraint (matching the `onConflict` target).

---

## Summary


| Fix                               | Type           | Severity |
| --------------------------------- | -------------- | -------- |
| A: Admin entitlement write policy | RLS policy     | BLOCKER  |
| B: User completion update policy  | RLS policy     | BLOCKER  |
| C: Remove duplicate constraint    | Schema cleanup | LOW      |


After these 3 changes, the First Green Run verification script can be executed without silent RLS failures.  
  
and confirm with   
  
Yep — this is the correct diagnosis, and you’ve zeroed in on the *real* reason “everything is deployed but nothing shows up in DB”: **silent RLS failures**.

Below is the **final, production-safe version** of the 3 fixes (A/B/C), with two important hardening tweaks:

- Don’t use `FOR ALL` unless you truly want admins to be able to `DELETE` entitlements (usually you don’t). Split into `SELECT/INSERT/UPDATE`.
- Make the entitlement policy *organization-aware* if your entitlements include `metadata.organization_id` (so a coordinator/manager can’t write entitlements for any org). I’ll give you a minimal version first (role-only), and an optional stricter version.

---

# ✅ APPLY THESE 3 DB CHANGES NOW (UNBLOCK FIRST GREEN RUN)

## Fix A (BLOCKER): Allow Admin/Coordinator/Manager to INSERT + UPDATE `course_entitlements`

### Option A1 — Minimal (role-based) **recommended for First Green Run**

```sql
-- Ensure RLS is enabled (if not already)
ALTER TABLE public.course_entitlements ENABLE ROW LEVEL SECURITY;

-- INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_entitlements'
      AND policyname='Role can insert entitlements'
  ) THEN
    CREATE POLICY "Role can insert entitlements"
    ON public.course_entitlements
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','coordinator','manager')
      )
    );
  END IF;
END $$;

-- UPDATE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_entitlements'
      AND policyname='Role can update entitlements'
  ) THEN
    CREATE POLICY "Role can update entitlements"
    ON public.course_entitlements
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','coordinator','manager')
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin','coordinator','manager')
      )
    );
  END IF;
END $$;

```

### Option A2 — Stricter (org-scoped) **do after first green**

Only do this if:

- entitlements include `metadata->>'organization_id'`
- and coordinators/managers should only manage their org

```sql
-- Example: restrict coordinator/manager to their org; admin can manage all
-- Assumes organization membership exists and metadata stores organization_id as string UUID.

CREATE POLICY "Org roles can insert entitlements (scoped)"
ON public.course_entitlements
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND (
        ur.role = 'admin'
        OR (
          ur.role IN ('coordinator','manager')
          AND EXISTS (
            SELECT 1
            FROM public.organization_members om
            WHERE om.user_id = auth.uid()
              AND om.organization_id::text = (course_entitlements.metadata->>'organization_id')
          )
        )
      )
  )
);

```

---

## Fix B (BLOCKER): Allow users to UPDATE their own `course_completions`

You already noted inserts work, but updates on conflict fail without an UPDATE policy.

```sql
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_completions'
      AND policyname='Users can update their own completions'
  ) THEN
    CREATE POLICY "Users can update their own completions"
    ON public.course_completions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

```

Optional (if user needs insert too, and it’s not already there):

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public'
      AND tablename='course_completions'
      AND policyname='Users can insert their own completions'
  ) THEN
    CREATE POLICY "Users can insert their own completions"
    ON public.course_completions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

```

---

## Fix C (CLEANUP): Remove duplicate unique constraint on `course_completions`

Before dropping, confirm which is redundant:

```sql
SELECT conname, pg_get_constraintdef(c.oid) AS def
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname='public'
  AND t.relname='course_completions'
  AND c.contype='u';

```

Then drop the redundant one (your suggestion is fine as long as the other remains):

```sql
ALTER TABLE public.course_completions
DROP CONSTRAINT IF EXISTS course_completions_user_id_course_id_key;

```

✅ After this, make sure your client upsert uses the remaining constraint target consistently. If the remaining constraint name is `course_completions_user_course_unique`, your `onConflict: 'user_id,course_id'` is still valid (it targets columns, not constraint name).

---

# 🔍 Post-fix “No more silent failures” checks (fast)

### 1) As an admin user, test entitlement write path quickly

- Assign a seat in the admin UI
- Then verify:

```sql
SELECT COUNT(*) FROM course_entitlements;

```

It should no longer stay 0 once you exercise the flow.

### 2) As an employee, complete 1 module and confirm `course_completions` update works

After 2 modules (to force a second update), verify:

```sql
SELECT completion_percent, passed
FROM course_completions
WHERE user_id='<EMP1_ID>'
ORDER BY completed_at DESC NULLS LAST
LIMIT 1;

```

---

# One more thing (not blocking, but will bite soon)

### Org trigger limitation is still real

Your trigger uses `auth.uid()`. If orgs are created via service-role edge function, it won’t link members. For “first green run,” just make sure your org is created via an authenticated path (manager signup completion) **or** explicitly create membership in the edge function that creates orgs.

---

If you want the fastest path to “first green run” without touching RLS at all: we can reroute the admin seat assignment and module completion writes through a small edge function that uses the service role. But your RLS approach is better long-term—so I’d do the SQL above and then immediately run the E2E again.