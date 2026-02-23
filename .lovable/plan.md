# UAT Readiness: Create RPC + Fast-Track Exam Eligibility

## Current Blockers (2 things preventing UAT)

1. **RPC `log_exam_identity_verification` does not exist in the database** -- the migration file was created in a previous message but was never applied. The `ExamCheckInQueue` component calls this RPC on every verify action, so manager verification will error without it.
2. **Both employees have 0 module completions** -- the exam gate requires modules 0-18 to be completed. Neither Emp1 nor Emp2 has any `user_progress` or `course_completions` rows.

## Plan

### Step 1: Create the RPC via database migration

Deploy the `log_exam_identity_verification` function that writes to `security_audit_log` with the correct column mapping:

- `user_id` = manager (actor)
- `action_type` = 'exam_identity_verified'
- `table_name` = 'exam_checkins'
- `record_id` = checkin row ID
- `new_values` = JSON with target_user_id, attempt_id, has_photo

Include `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated`.

### Step 2: Fast-track exam eligibility via SQL

Insert 19 `user_progress` rows (modules 0-18) for both Emp1 and Emp2 with `is_completed = true`, using `ON CONFLICT` on the `(user_id, module_id)` unique constraint.

Also upsert `course_completions` rows to `completion_percent = 100`, `passed = false` using `ON CONFLICT` on `course_completions_user_course_unique`.

This must be run in the Supabase SQL Editor since it's a data operation (INSERT/UPSERT), not a schema change.

### Step 3: Verify preflight

Re-run the preflight queries to confirm:

- A1: Both users show `completed_modules_0_18 = 19`
- A2: Both users show `completion_percent = 100`

## Technical Details

### RPC Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.log_exam_identity_verification(p_checkin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target uuid;
  v_attempt uuid;
  v_has_photo boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, attempt_id, (photo_url IS NOT NULL)
    INTO v_target, v_attempt, v_has_photo
  FROM public.exam_checkins
  WHERE id = p_checkin_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Check-in not found: %', p_checkin_id;
  END IF;

  INSERT INTO public.security_audit_log (
    user_id, action_type, table_name, record_id, old_values, new_values, created_at
  ) VALUES (
    v_actor,
    'exam_identity_verified',
    'exam_checkins',
    p_checkin_id,
    NULL,
    jsonb_build_object(
      'target_user_id', v_target,
      'attempt_id', v_attempt,
      'has_photo', v_has_photo,
      'verified_by', v_actor
    ),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_exam_identity_verification(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.log_exam_identity_verification(uuid) TO authenticated;
```

### Fast-Track SQL (for SQL Editor)

Uses the actual module IDs discovered from `course_modules` and the exact unique constraint names from the database.

```sql
DO $$
DECLARE
  v_course_id uuid := 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
  v_emp1 uuid := 'f167e515-4fde-42a6-9fa6-77c227ffd495';
  v_emp2 uuid := 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5';
BEGIN
  INSERT INTO public.user_progress
    (user_id, course_id, module_id, is_completed, score, time_spent, completed_at)
  SELECT
    u.user_id, v_course_id, cm.id, true, 100, 300, now()
  FROM public.course_modules cm
  CROSS JOIN (VALUES (v_emp1), (v_emp2)) AS u(user_id)
  WHERE cm.course_id = v_course_id
    AND cm.module_number BETWEEN 0 AND 18
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    is_completed = true,
    score = GREATEST(COALESCE(user_progress.score, 0), 100),
    completed_at = COALESCE(user_progress.completed_at, now()),
    updated_at = now();

  INSERT INTO public.course_completions
    (user_id, course_id, completion_percent, passed)
  VALUES
    (v_emp1, v_course_id, 100, false),
    (v_emp2, v_course_id, 100, false)
  ON CONFLICT ON CONSTRAINT course_completions_user_course_unique DO UPDATE SET
    completion_percent = 100,
    completed_at = COALESCE(course_completions.completed_at, now());
END $$;
```

## Files Changed


| File                                  | Change                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| `supabase/migrations/[timestamp].sql` | New migration: create `log_exam_identity_verification` RPC + grants |


No frontend changes needed. After both SQL operations complete, the full UAT flow (Emp1 PASS + Emp2 FAIL) can proceed.  
  
✅ Copy that — your plan is correct, and those **are** the two blockers that will stop UAT cold:

1. **RPC missing** → manager “Verify” will error every time
2. **No module completion** → exam gate blocks both employees

Here’s the **exact, copy/paste execution** to get to “Exam-ready” in minutes.

---

# Step 1 — Apply Patch 4 RPC (SQL Editor)

Run this in **Supabase SQL Editor** (this is schema-level, but SQL Editor is fine for it):

```sql
CREATE OR REPLACE FUNCTION public.log_exam_identity_verification(p_checkin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target uuid;
  v_attempt uuid;
  v_has_photo boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, attempt_id, (photo_url IS NOT NULL)
    INTO v_target, v_attempt, v_has_photo
  FROM public.exam_checkins
  WHERE id = p_checkin_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Check-in not found: %', p_checkin_id;
  END IF;

  INSERT INTO public.security_audit_log (
    user_id, action_type, table_name, record_id, old_values, new_values, created_at
  ) VALUES (
    v_actor,
    'exam_identity_verified',
    'exam_checkins',
    p_checkin_id,
    NULL,
    jsonb_build_object(
      'target_user_id', v_target,
      'attempt_id', v_attempt,
      'has_photo', v_has_photo,
      'verified_by', v_actor
    ),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_exam_identity_verification(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.log_exam_identity_verification(uuid) TO authenticated;

```

### Quick verify (must return 1 row):

```sql
select proname
from pg_proc
where proname = 'log_exam_identity_verification';

```

---

# Step 2 — Fast-track Exam Eligibility (SQL Editor)

Run this next (data-level):

```sql
DO $$
DECLARE
  v_course_id uuid := 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
  v_emp1 uuid := 'f167e515-4fde-42a6-9fa6-77c227ffd495';
  v_emp2 uuid := 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5';
BEGIN
  INSERT INTO public.user_progress
    (user_id, course_id, module_id, is_completed, score, time_spent, completed_at)
  SELECT
    u.user_id, v_course_id, cm.id, true, 100, 300, now()
  FROM public.course_modules cm
  CROSS JOIN (VALUES (v_emp1), (v_emp2)) AS u(user_id)
  WHERE cm.course_id = v_course_id
    AND cm.module_number BETWEEN 0 AND 18
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    is_completed = true,
    score = GREATEST(COALESCE(public.user_progress.score, 0), 100),
    completed_at = COALESCE(public.user_progress.completed_at, now()),
    updated_at = now();

  INSERT INTO public.course_completions
    (user_id, course_id, completion_percent, passed, completed_at)
  VALUES
    (v_emp1, v_course_id, 100, false, now()),
    (v_emp2, v_course_id, 100, false, now())
  ON CONFLICT ON CONSTRAINT course_completions_user_course_unique DO UPDATE SET
    completion_percent = 100,
    completed_at = COALESCE(public.course_completions.completed_at, now()),
    updated_at = now();
END $$;

```

---

# Step 3 — Verify Preflight (must be green)

### A1 — module completion counts

```sql
select
  up.user_id,
  count(*) as completed_modules_0_18
from public.user_progress up
join public.course_modules cm on cm.id = up.module_id
where up.course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  and up.user_id in (
    'f167e515-4fde-42a6-9fa6-77c227ffd495',
    'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
  )
  and up.is_completed = true
  and cm.module_number between 0 and 18
group by up.user_id;

```

✅ Expected: **2 rows**, each `completed_modules_0_18 = 19`

### A2 — course completion row

```sql
select user_id, completion_percent, passed, completed_at
from public.course_completions
where course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  and user_id in (
    'f167e515-4fde-42a6-9fa6-77c227ffd495',
    'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
  );

```

✅ Expected: **completion_percent=100**, **passed=false** for both (until exam pass)

---

# Step 4 — Run UAT Exam Flow (Emp1 PASS, Emp2 FAIL)

## Emp1 PASS (proxy photo check-in + certificate)

**Employee (Emp1):**

1. Login Emp1 → go to Final Exam → Start Exam
2. Take selfie → Submit
3. You should land on **Awaiting Manager Verification**

**Manager:**

1. Login Manager → Manager Dashboard → **Exam Check-Ins**
2. Find Emp1 → click **Verify**
  - This calls `supabase.rpc('log_exam_identity_verification', { p_checkin_id })`

**Employee:**

1. Auto-unlocks to “Ready” → Start Exam
2. Score **≥ 80**
3. Results screen should show pass + **Generate Certificate**

**DB proofs:**

```sql
-- check-in should be verified
select status, verified_by, verified_at
from public.exam_checkins
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by created_at desc
limit 1;

-- audit log should have event
select action_type, table_name, record_id, user_id as actor_id, created_at, new_values
from public.security_audit_log
where action_type = 'exam_identity_verified'
order by created_at desc
limit 5;

-- exam attempt should be passed
select id, total_score, is_passed, completed_at
from public.exam_attempts
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by created_at desc
limit 3;

-- certificate should exist
select verification_code, status, issued_at, expires_at
from public.user_certificates
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by issued_at desc
limit 3;

```

---

## Emp2 FAIL + remediation handling (employee + manager)

**Employee (Emp2):**

1. Start Exam → selfie → Awaiting verification
2. Manager verifies
3. Take exam and intentionally score **<80**
4. Confirm:
  - Shows remediation recommendations by topic
  - “Review Module” links present
  - **No certificate button**

**Manager handling after fail:**

1. Manager Dashboard → At Risk widget (or run RPC)
2. Emp2 should show `at_risk` / `stalled` depending on activity

**DB proofs:**

```sql
-- attempt should be failed and recorded
select id, total_score, is_passed, completed_at, topic_scores
from public.exam_attempts
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by created_at desc
limit 5;

-- no certificate should exist (or no new one)
select *
from public.user_certificates
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by issued_at desc
limit 5;

-- manager at-risk feed
select *
from public.get_at_risk_students('511f5c69-b0f8-455d-a4b7-1972f6c66a41')
limit 50;

```

---

# Certificate capture + storage + lookup (what to verify)

Right now we can verify **certificate issuance** in `user_certificates`. To prove “lookup works,” do this:

1. From UI, copy Emp1’s `verification_code`
2. Run:

```sql
select
  uc.verification_code,
  uc.status,
  uc.issued_at,
  uc.expires_at,
  p.first_name,
  p.last_name,
  p.email_cache
from public.user_certificates uc
join public.profiles p on p.user_id = uc.user_id
where uc.verification_code = '<PASTE_CODE>';

```

✅ If you also store a PDF URL or stored asset:

- tell me the table/column (ex: `certificate_url`, `storage_path`, etc.) and I’ll give you the exact storage verification query.

---

# What I need from you next (so I can confirm “UAT passed”)

Paste:

1. Output of **A1 + A2** preflight
2. After Emp1: latest rows from `exam_checkins`, `exam_attempts`, `user_certificates`
3. After Emp2: latest `exam_attempts` row + confirmation no certificate

…and I’ll call out any mismatch immediately (duplicate attempts, missing audit row, certificate not issued, check-in stuck, etc.) and the fastest fix.