# Fix Student Dashboard: 4 Blockers Preventing Emp1 from Seeing Training

## Summary

The student dashboard renders a blank page because of 4 independent bugs. This plan fixes all of them so employees can log in and see the RVT course.

## Bug 1: `get_course_state` RPC references non-existent `started_at` column (400 error)

**Root cause:** The `get_course_state` database function references `up.started_at` on the `user_progress` table, but that column does not exist. The table has `completed_at` and `created_at` but no `started_at`.

**Fix:** Alter the RPC function to infer "in_progress" from row existence instead of a `started_at` column:

```sql
-- Change this line:
WHEN up.started_at IS NOT NULL THEN 'in_progress'
-- To:
WHEN up.id IS NOT NULL AND up.completed_at IS NULL THEN 'in_progress'
```

This uses the presence of a `user_progress` row (with no `completed_at`) to mean "in progress" -- which is semantically correct since a row is only created when a user starts a module.

**Migration:** `CREATE OR REPLACE FUNCTION public.get_course_state(...)` with the corrected logic.

---

## Bug 2: Hardcoded `default-course-id` in exam attempts (wrong data)

**Root cause:** Two files use the literal string `'default-course-id'` instead of the real course ID:

1. `src/hooks/useExamAttempts.tsx` line 44 -- default parameter
2. `src/pages/Course/FinalExam.tsx` line 647 -- insert statement

**Fix:**

- `useExamAttempts.tsx`: Change default from `'default-course-id'` to the constant `COURSE_ID` (`'e6841a2f-4e92-47c3-9ed4-243ccc22338b'`). Import it or inline.
- `FinalExam.tsx`: Replace the hardcoded string with the actual course ID constant. Need to check how the course ID is available in that component (likely passed as prop or from a hook).

---

## Bug 3: `rvt_enrollments` table does not exist (404 error)

**Root cause:** Two components query `rvt_enrollments` which doesn't exist as a table:

1. `src/components/course/DeadlineCountdown.tsx` -- student deadline display
2. `src/components/team/CompletionAnalyticsWidget.tsx` -- manager analytics

**Fix:** Make both components gracefully handle the missing table:

- `DeadlineCountdown.tsx`: Wrap the query in a try/catch and return `null` (hide the component) on any error, including 404. The component already returns `null` when no enrollment found, so this is safe.
- `CompletionAnalyticsWidget.tsx`: Same pattern -- catch errors gracefully and show empty state.

This is the fastest safe approach. Creating a `rvt_enrollments` view is a future enhancement but not needed to unblock UAT.

---

## Bug 4: `user_journey_state` insert conflict (409 error)

**Root cause:** `useJourneyState.tsx` does a plain `insert` when no row exists. If the row was already created (e.g., by `AcceptInvitation.tsx`), it hits a unique constraint on `user_id`.

**Fix:** Change the insert to an `upsert` with `onConflict: 'user_id'`:

```typescript
// Before:
.insert({ user_id: user.id, ... })
// After:
.upsert({ user_id: user.id, ... }, { onConflict: 'user_id' })
```

This makes it idempotent -- if the row exists, it merges; if not, it creates.

---

## Files Changed


| File                                                | Change                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Database migration                                  | `CREATE OR REPLACE FUNCTION get_course_state` -- replace `up.started_at IS NOT NULL` with `up.id IS NOT NULL AND up.completed_at IS NULL` |
| `src/hooks/useExamAttempts.tsx`                     | Change default `courseId` from `'default-course-id'` to the real course ID constant                                                       |
| `src/pages/Course/FinalExam.tsx`                    | Replace hardcoded `'default-course-id'` with real course ID                                                                               |
| `src/components/course/DeadlineCountdown.tsx`       | Gracefully handle 404 from missing `rvt_enrollments` table                                                                                |
| `src/components/team/CompletionAnalyticsWidget.tsx` | Gracefully handle 404 from missing `rvt_enrollments` table                                                                                |
| `src/hooks/useJourneyState.tsx`                     | Change `.insert()` to `.upsert()` with `onConflict: 'user_id'`                                                                            |


## Expected Outcome

After these fixes:

- Student dashboard renders without blank screen
- `get_course_state` returns valid module states for Emp1
- Exam attempts use the correct course ID
- Deadline countdown and analytics degrade gracefully
- Journey state creation is idempotent (no 409)  
  
confirm with   
Locked in. Your plan is solid, and it’s scoped exactly right to unblock Emp1 **without inventing new schema**. Below is the “ready-to-apply” implementation pack: **SQL migration** + **TS patches** (with safe patterns so the UI never white-screens again).
  ---
  # 1) DB Migration: Patch `get_course_state` (remove `started_at` dependency)
  Create a migration file (Supabase migrations folder), e.g.:
  `supabase/migrations/20260222_fix_get_course_state.sql`
  ### ✅ Minimal change (only swap the condition)
  Use your exact intent: “in progress” = progress row exists and not completed.
  > **Important:** you must edit the existing function body in-place. Below is a template approach. Replace the signature/body to match your existing function definition and just swap the CASE condition.
  ```sql
  -- 20260222_fix_get_course_state.sql

  create or replace function public.get_course_state(
    p_user_id uuid,
    p_course_id uuid
  )
  returns table (
    module_id uuid,
    state text
  )
  language sql
  stable
  as $$
    /*
      NOTE: This is a template. Keep your existing SELECT / joins.
      The critical change is:
        WHEN up.id IS NOT NULL AND up.completed_at IS NULL THEN 'in_progress'
      instead of:
        WHEN up.started_at IS NOT NULL THEN 'in_progress'
    */

    select
      m.id as module_id,
      case
        when up.completed_at is not null then 'completed'
        when up.id is not null and up.completed_at is null then 'in_progress'
        else 'not_started'
      end as state
    from public.course_modules m
    left join public.user_progress up
      on up.module_id = m.id
     and up.user_id = p_user_id
    where m.course_id = p_course_id
    order by m.sort_order nulls last, m.created_at asc;
  $$;

  ```
  ### Quick verification query
  After migration:
  ```sql
  select * from public.get_course_state(
    'f167e515-4fde-42a6-9fa6-77c227ffd495'::uuid,
    'e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid
  ) limit 20;

  ```
  ✅ Should return module states without error.
  ---
  # 2) Bug 2: Remove `default-course-id` from exam attempts (2 files)
  ## 2A) `src/hooks/useExamAttempts.tsx`
  Replace default `'default-course-id'` with your real RVT course ID constant.
  **Best practice:** create a single constant and import everywhere.
  ### Add constant (if you don’t already have one)
  Create: `src/lib/constants/courses.ts`
  ```ts
  // src/lib/constants/courses.ts
  export const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

  ```
  ### Patch hook
  ```ts
  // src/hooks/useExamAttempts.tsx
  import { RVT_COURSE_ID } from '@/lib/constants/courses';

  // Before (example)
  export function useExamAttempts(courseId = 'default-course-id') { ... }

  // After
  export function useExamAttempts(courseId: string = RVT_COURSE_ID) { ... }

  ```
  ## 2B) `src/pages/Course/FinalExam.tsx`
  Replace the hardcoded insert.
  ### Preferred
  Use the same `RVT_COURSE_ID` constant OR use the actual `courseId` already in context/props if available.
  ```ts
  import { RVT_COURSE_ID } from '@/lib/constants/courses';

  // ... later where you insert:
  const courseIdToUse = courseId ?? RVT_COURSE_ID; // if courseId exists in scope

  await supabase
    .from('exam_attempts')
    .insert({
      // ...
      course_id: courseIdToUse,
    });

  ```
  ✅ This ensures you never write rows to a bogus course.
  ---
  # 3) Bug 3: `rvt_enrollments` 404 — graceful degradation (2 components)
  You’re right: **don’t create a view right now** if the goal is unblocking UAT. Handle it gracefully.
  ## 3A) `src/components/course/DeadlineCountdown.tsx`
  Pattern: if the fetch errors (including 404), return `null` and let the page render.
  ```ts
  try {
    const { data, error } = await supabase
      .from('rvt_enrollments')
      .select('deadline_at') // whatever you expect
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .maybeSingle();

    if (error) return null;
    if (!data?.deadline_at) return null;

    // render countdown...
  } catch {
    return null;
  }

  ```
  ## 3B) `src/components/team/CompletionAnalyticsWidget.tsx`
  Same approach, but show an “empty analytics” state instead of crashing.
  ```ts
  let enrollments: any[] = [];

  try {
    const { data, error } = await supabase
      .from('rvt_enrollments')
      .select('*')
      .eq('organization_id', orgId);

    if (!error && data) enrollments = data;
  } catch {
    // swallow; keep enrollments empty
  }

  // Render widget; if enrollments.length === 0 show empty state

  ```
  ✅ Both components stop being fatal dependencies.
  ---
  # 4) Bug 4: `user_journey_state` 409 — switch insert → upsert
  ## `src/hooks/useJourneyState.tsx`
  ```ts
  // Before
  await supabase
    .from('user_journey_state')
    .insert({ user_id: user.id, ...payload });

  // After
  await supabase
    .from('user_journey_state')
    .upsert(
      { user_id: user.id, ...payload },
      { onConflict: 'user_id' }
    );

  ```
  **Also do this:** treat errors as non-fatal for render. If journey state fails, dashboard should still render.
  ---
  # 5) Final “Emp1 unblocks” verification checklist
  After deploying these:
  ### Browser (incognito)
  - Login Emp1 → `/student-dashboard` renders (no blank screen)
  - RVT course visible
  - Module 0 opens
  ### Network tab must be clean of fatal blockers
  - `get_course_state` → 200
  - `user_journey_state` → no 409 loops
  - `exam_attempts` → course_id is real UUID, not `default-course-id`
  - `rvt_enrollments` → may still 404, but page must not crash
  ---
  # 6) One extra hardening step (prevents future white screens)
  Even after these fixes, add a **top-level error boundary** to `/student-dashboard` route so any future query mismatch doesn’t blank the entire page. This is a 10-minute insurance policy.
  ---
  If you paste the **current** `get_course_state` **function definition** (or just the SELECT/CASE section), I’ll rewrite the migration so it matches your exact schema names (`course_modules`, `modules`, etc.) and won’t risk signature mismatch.