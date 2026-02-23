# Fix Course Access Redirect: Rename `can_access` to `can_access_course` + Add `roles`

## Problem

The `get_access_snapshot` database function returns `can_access` but the frontend (`RequireAccess.tsx`, `useAccessSnapshot.ts`, `useGuardedNavigation.ts`) reads `can_access_course`. This mismatch causes every course route to silently redirect to `/` because the guard sees `undefined` (falsy) and denies access.

## Fix

A single SQL migration that replaces the existing function with the same logic but two changes:

1. **Rename key**: `'can_access'` becomes `'can_access_course'` in all 6 RETURN statements
2. **Add `roles` array**: Compute roles from `user_roles` table and include in every response

No frontend changes needed -- the frontend already expects these exact field names.

## Migration Details

The function signature stays identical: `get_access_snapshot(p_course_id uuid DEFAULT NULL) RETURNS jsonb`. All existing logic (course lookup, public course check, auth check, prerequisite check, entitlement check, org membership check) is preserved verbatim.

New variable added to DECLARE block:

- `v_roles jsonb` -- populated from `user_roles` after resolving `v_user_id`

Each of the 6 return statements gets:

- `'can_access'` renamed to `'can_access_course'`
- `'roles', coalesce(v_roles, '[]'::jsonb)` added

For the two early returns where `v_user_id` is null (course_not_found, public course), roles defaults to `'[]'`.

## Files Changed


| File / Resource | Change                                                                                                                                       |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| DB Migration    | `CREATE OR REPLACE FUNCTION get_access_snapshot` -- rename `can_access` to `can_access_course`, add `roles` array in all 6 return statements |


## Expected Outcome

- Emp1 clicks "Start Training" and lands on `/course` (no redirect)
- `RequireAccess` reads `can_access_course: true` and allows rendering
- Admin users are correctly identified via `roles` array containing `'admin'`
- All existing access logic (prerequisites, entitlements, org membership) unchanged  
  
Perfect. You have everything you need, and the change is genuinely low-risk because it’s **a pure response-shape fix** that aligns the DB contract to what the frontend already expects.
  Since you already have the full function text locally, here’s the **exact patch recipe** you can apply in one migration without re-authoring the logic:
  ---
  # ✅ Single Migration Patch: `get_access_snapshot`
  Create:
  `supabase/migrations/20260222_fix_get_access_snapshot_can_access_course.sql`
  ## 1) Replace the function with identical logic + two additions
  ### A) Add `v_roles` to `DECLARE`
  Inside your existing `DECLARE` block, add:
  ```sql
  v_roles jsonb := '[]'::jsonb;

  ```
  ### B) Populate `v_roles` after `v_user_id` is resolved
  Right after the code that sets `v_user_id` (usually `v_user_id := auth.uid();`), add:
  ```sql
  if v_user_id is not null then
    select coalesce(jsonb_agg(ur.role order by ur.role), '[]'::jsonb)
    into v_roles
    from public.user_roles ur
    where ur.user_id = v_user_id;
  end if;

  ```
  This keeps the “early return” cases safe (roles stays `[]` when unauthenticated).
  ---
  ## 2) Update all 6 RETURN statements
  ### A) Rename the key
  In every `jsonb_build_object(...)` you return, replace:
  ```sql
  'can_access', <expr>

  ```
  with:
  ```sql
  'can_access_course', <expr>

  ```
  ### B) Add roles field (top-level)
  Add this key to each returned object:
  ```sql
  'roles', coalesce(v_roles, '[]'::jsonb)

  ```
  **Where to put it:** anywhere in the top-level object is fine, but keep it consistent (I usually place it near `user_id` / `organization_id`).
  For the two early returns (where user is null), this will still output `[]`.
  ---
  # ✅ Example “before/after” for one return
  **Before**
  ```sql
  return jsonb_build_object(
    'course_id', v_course_id,
    'user_id', v_user_id,
    'can_access', true,
    'deny_reason', null
  );

  ```
  **After**
  ```sql
  return jsonb_build_object(
    'course_id', v_course_id,
    'user_id', v_user_id,
    'can_access_course', true,
    'deny_reason', null,
    'roles', coalesce(v_roles, '[]'::jsonb)
  );

  ```
  Repeat for each return.
  ---
  # ✅ Minimal verification (DB)
  After migration:
  ```sql
  select public.get_access_snapshot('e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid) as snap;

  ```
  Confirm the JSON contains:
  - `can_access_course` (boolean)
  - `roles` (array)
  - **and no longer relies on** `can_access`
  ---
  # ✅ UI verification (Emp1)
  Incognito:
  1. Login Emp1 (`uat-greenrun2+emp1@procannedu.com` / `UATGreen2025!`)
  2. Click **Start Training**
  3. ✅ You stay on `/course` and the course player renders (no redirect to `/`)
  If it still bounces, the next likely cause is:
  - downstream content query failing (RLS/404) **after** the guard passes — Network tab will show which call fails.
  ---
  # One optional “future-proof” improvement (not required)
  If you want to make this unbreakable across future refactors, return **both** keys for one release:
  - `can_access_course`
  - `can_access`
  …but since your frontend expects `can_access_course` and you want to align the contract cleanly, your current plan is correct.
  ---
  If you paste just **one** of the six return blocks (or the function body header + declare + first return), I can generate the **fully rewritten CREATE OR REPLACE FUNCTION** verbatim (with your exact variable names/signature) so you can drop it in without manual editing.  
    
  ✅ Agreed — ship it exactly that way. Since you already have the full function text in-hand, the safest/fastest move is a **surgical migration** that keeps all logic verbatim and only changes the response shape.
  Here’s the **migration skeleton + the exact diffs** you apply to your existing function body (no guessing, no refactor).
  ---
  # DB Migration (copy/paste skeleton)
  Create:
  `supabase/migrations/20260222_fix_get_access_snapshot_contract.sql`
  ```sql
  begin;

  create or replace function public.get_access_snapshot(p_course_id uuid default null)
  returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $function$
  declare
    -- ✅ ADD THIS
    v_roles jsonb := '[]'::jsonb;

    -- (keep all your existing declared variables exactly as-is)
    -- v_user_id uuid;
    -- v_course record;
    -- v_org_id uuid;
    -- etc...
  begin
    -- (keep all your existing logic verbatim up to v_user_id resolution)

    -- wherever you set v_user_id (e.g., v_user_id := auth.uid();), immediately after it add:

    if v_user_id is not null then
      select coalesce(jsonb_agg(ur.role order by ur.role), '[]'::jsonb)
      into v_roles
      from public.user_roles ur
      where ur.user_id = v_user_id;
    end if;

    -- ------------------------------------------------------------
    -- KEEP ALL EXISTING LOGIC VERBATIM
    -- Only edits below are inside the return objects:
    --
    -- 1) rename 'can_access' -> 'can_access_course'
    -- 2) add 'roles', coalesce(v_roles, '[]'::jsonb)
    -- ------------------------------------------------------------

    -- ✅ Apply those two edits to ALL SIX return jsonb_build_object(...) statements

  end;
  $function$;

  commit;

  ```
  ---
  # The only two edits you make inside each RETURN object
  ## 1) Rename the key
  Everywhere you have:
  ```sql
  'can_access', <boolean_expr>

  ```
  Change to:
  ```sql
  'can_access_course', <boolean_expr>

  ```
  ## 2) Add roles field
  Add:
  ```sql
  'roles', coalesce(v_roles, '[]'::jsonb)

  ```
  into the top-level JSON object of **each** return.
  ### Recommended placement (consistent)
  Put it near the other access fields:
  ```sql
  return jsonb_build_object(
    ...,
    'can_access_course', <expr>,
    'deny_reason', <expr>,
    'roles', coalesce(v_roles, '[]'::jsonb)
  );

  ```
  For the early returns (course not found / public course) where `v_user_id` is null, `v_roles` stays `[]`, which is exactly what you want.
  ---
  # Quick verification (DB)
  After applying the migration:
  ```sql
  select public.get_access_snapshot('e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid) as snap;

  ```
  Confirm:
  - `snap->>'can_access_course'` is `"true"`/`"false"`
  - `snap->'roles'` exists and is an array
  - `snap->>'can_access'` is absent (or at least no longer relied on)
  ---
  # UI verification (Emp1)
  Incognito:
  1. Login Emp1
  2. Click **Start Training**
  3. ✅ You should **stay on** `/course` and the course player should load (no redirect to `/`)
  If it still redirects after this fix, the next culprit will be visible in Network:
  - module list fetch blocked by RLS
  - course modules query error
  - course player route expecting a param not present
  …but this fix addresses the exact guard mismatch you described.
  ---
  If you paste the function body (even just the first ~60 lines + one return object), I’ll output the **fully rewritten** `CREATE OR REPLACE FUNCTION` with your exact variable names/signature and all 6 returns patched, so you can drop it in with zero manual edits.