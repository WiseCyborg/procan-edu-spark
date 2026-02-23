# Patch 4: Create `log_exam_identity_verification` RPC (Schema-Matched)

## Problem

The proxy photo check-in system needs an audit trail RPC, but neither Option A nor Option B from the user's suggestion exactly matches the actual `security_audit_log` schema. Using either as-is would cause a runtime column mismatch error.

## Actual Schema

The `security_audit_log` table has these columns:

- `id` (uuid, PK)
- `user_id` (uuid) -- the actor
- `action_type` (text) -- event name
- `table_name` (text) -- source table
- `record_id` (uuid) -- the affected record
- `old_values` (jsonb) -- state before
- `new_values` (jsonb) -- state after
- `ip_address` (text)
- `user_agent` (text)
- `created_at` (timestamptz)

## Migration SQL

Create the RPC function that maps correctly to these columns:

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

Key mapping decisions:

- `user_id` = the manager (actor) who performed the verification
- `action_type` = `'exam_identity_verified'`
- `table_name` = `'exam_checkins'`
- `record_id` = the check-in row ID
- `old_values` = NULL (no prior state)
- `new_values` = JSON with target user, attempt, and photo flag
- `ip_address` and `user_agent` left NULL (not available server-side in RPC context)

## Files Changed


| File                                  | Change                                       |
| ------------------------------------- | -------------------------------------------- |
| `supabase/migrations/[timestamp].sql` | New migration with the RPC function + grants |


No frontend changes needed -- the existing `ExamCheckInQueue.tsx` already calls `supabase.rpc('log_exam_identity_verification', { p_checkin_id: ... })` with the correct parameter name.  
  
Yep — with that schema, your Patch 4 SQL is **correct** and safe to ship. The only optional improvement is to *attempt* to capture `ip_address` + `user_agent` if you decide to pass them from the frontend later (not required for UAT).

Now let’s run the **full exam flow**:

- **Emp1 = PASS → certificate issued → certificate lookup works**
- **Emp2 = FAIL → remediation shown → retake workflow (manager + employee) → no certificate until pass**

Below is the **exact step-by-step** with **DB proof queries** after each checkpoint.

---

# 0) Preflight (Do this once)

## Confirm both employees are exam-eligible (modules 0–18 completed)

```sql
select user_id, count(*) as completed_modules
from public.user_progress
where user_id in (
  'f167e515-4fde-42a6-9fa6-77c227ffd495', -- Emp1
  'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'  -- Emp2
)
and course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
and is_completed = true
group by user_id;

```

**Expected:** 19 each (modules 0–18)

## Clear old attempts for clean evidence (optional)

Only if you want a clean log view for UAT. Otherwise skip.

```sql
select id, created_at, is_passed, total_score
from public.exam_attempts
where user_id in (
  'f167e515-4fde-42a6-9fa6-77c227ffd495',
  'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
)
order by created_at desc
limit 10;

```

---

# 1) Emp1 PASS flow (with proxy photo check-in)

## Step 1A — Employee starts exam + takes selfie

**Emp1 UI**

1. Login Emp1
2. Go to Course / Final Exam
3. Click **Start Exam**
4. Complete **Photo Verification** (take selfie + submit)
5. Emp1 should land on **Awaiting Manager Verification** screen

### DB proof: check-in created + pending

```sql
select id, attempt_id, user_id, status, bypass_reason, verified_by, verified_at, created_at
from public.exam_checkins
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by created_at desc
limit 1;

```

**Expected:** `status='pending'`, `verified_by is null`

---

## Step 1B — Manager verifies identity

**Manager UI**

1. Login as manager
2. Open **Exam Check-Ins** tab
3. Find Emp1 row → click **Verify**

Emp1 should auto-advance (real-time) to **Ready** stage.

### DB proof: check-in verified + audit entry exists

```sql
select id, status, verified_by, verified_at
from public.exam_checkins
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by created_at desc
limit 1;

```

**Expected:** `status='verified'`, `verified_by=<manager_id>`, `verified_at not null`

Audit row:

```sql
select action_type, table_name, record_id, user_id, new_values, created_at
from public.security_audit_log
where action_type = 'exam_identity_verified'
order by created_at desc
limit 5;

```

**Expected:** newest row contains `record_id = <checkin_id>` and `new_values.target_user_id = Emp1`

---

## Step 1C — Emp1 takes exam and PASSES

**Emp1 UI**

1. Click **Start Exam**
2. Answer questions to achieve **>= 80%**
3. Submit exam
4. Results page shows **Passed**
5. Click **Generate Certificate** (or whatever the pass CTA is)

### DB proof: exam_attempt updated (NOT duplicated)

```sql
select id, created_at, completed_at, total_score, passing_score, is_passed
from public.exam_attempts
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by created_at desc
limit 3;

```

**Expected:** latest attempt has `completed_at not null`, `is_passed=true`

Topic scores present:

```sql
select count(*) as topic_rows
from public.exam_topic_scores ets
join public.exam_attempts ea on ea.id = ets.exam_attempt_id
where ea.user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
and ea.course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

```

**Expected:** > 0

---

## Step 1D — Certificate issuance + storage + lookup

### DB proof: certificate exists + expires_at set

```sql
select verification_code, status, issued_at, expires_at
from public.user_certificates
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by issued_at desc
limit 3;

```

**Expected:** newest row `status='active'`, `issued_at not null`, `expires_at ~ 1 year later`

If you also issue into `certificates`:

```sql
select certificate_number, issue_date, expiry_date, pdf_url, status
from public.certificates
where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
order by issue_date desc
limit 3;

```

**Expected:** pdf_url populated (if your system uploads/records it)

### Certificate lookup test (UI + DB)

Whatever your public verify page is (commonly `/verify`), enter Emp1’s `verification_code`.

DB lookup:

```sql
select uc.verification_code, uc.status, uc.issued_at, uc.expires_at, p.first_name, p.last_name
from public.user_certificates uc
join public.profiles p on p.user_id = uc.user_id
where uc.verification_code = '<PASTE_VERIFICATION_CODE>';

```

**Expected:** returns Emp1 info + active cert

✅ This proves: **completion → pass → certificate → lookup/verification**.

---

# 2) Emp2 FAIL flow + “what happens next” (manager + employee)

## Step 2A — Emp2 starts exam + selfie + manager verifies (same as Emp1)

Repeat check-in process:

Check-in:

```sql
select id, attempt_id, status, verified_by, verified_at, created_at
from public.exam_checkins
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by created_at desc
limit 1;

```

---

## Step 2B — Emp2 takes exam and FAILS (< 80%)

**Emp2 UI**

1. Start exam
2. Answer enough wrong to get **< 80%**
3. Submit
4. Results page shows **Failed**
5. Confirm remediation UI appears (topic breakdown + “Review Module” buttons)

### DB proof: attempt shows failed, NO certificate created

Attempt:

```sql
select id, created_at, completed_at, total_score, passing_score, is_passed
from public.exam_attempts
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by created_at desc
limit 3;

```

**Expected:** newest `is_passed=false`

No certificate:

```sql
select verification_code, status, issued_at
from public.user_certificates
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by issued_at desc
limit 3;

```

**Expected:** **0 rows** (or no new rows)

Topic remediation data exists:

```sql
select ets.topic_area, ets.score_percentage, ets.needs_remediation
from public.exam_topic_scores ets
join public.exam_attempts ea on ea.id = ets.exam_attempt_id
where ea.user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by ets.needs_remediation desc, ets.score_percentage asc
limit 50;

```

**Expected:** some `needs_remediation=true`

---

# 3) FAIL handling SOP (what manager + employee do)

## Employee (Emp2) actions after FAIL

1. On results page, click **Review Module** for each failed topic (or “Return to Course”).
2. Re-complete modules tied to weak topics (even if already completed, they should still be viewable).
3. Reattempt the exam when allowed.

**Evidence you want:** user activity increases + time spent + module revisits.

- You’ll see updated `course_resume_state`
- You may not create new `user_progress` rows if already completed, but resume state timestamps should move.

---

## Manager actions after FAIL

1. Open **Team dashboard** or **At Risk** widget.
2. Confirm Emp2 appears as **at_risk/stalled/not_started** depending on your logic.
3. Use existing “Send Reminder” tooling (if wired) OR manual follow-up.
4. Ensure the remediation plan is followed before retake (policy-wise).

At-risk check:

```sql
select *
from public.get_at_risk_students('511f5c69-b0f8-455d-a4b7-1972f6c66a41')
limit 50;

```

---

# 4) Retake behavior (what you should validate)

### A) Retake cooldown enforced (if you implemented can_retake_at)

Look at the attempt table:

```sql
select id, created_at, completed_at, is_passed, total_score, can_retake_at
from public.exam_attempts
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by created_at desc
limit 5;

```

**Expected:** `can_retake_at` in the future (if cooldown exists)

### B) On retake: new check-in row should be created (per-attempt uniqueness)

```sql
select id, attempt_id, status, created_at
from public.exam_checkins
where user_id = 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5'
order by created_at desc
limit 5;

```

**Expected:** a **new** check-in row per new attempt

---

# 5) What “gaps” to look for during this exam UAT

As you execute, watch for these (they’re the usual “gotchas”):

1. **Duplicate attempts** still being inserted (should not happen now)
  - Proof: multiple attempts created at the same timestamp during one run
2. **Manager verify succeeds but employee doesn’t unlock**
  - Likely realtime subscription filter mismatch (attempt_id vs id)
  - Proof: check-in status is verified in DB but UI stays waiting
3. **Pass shows but no certificate issued**
  - Likely certificate issuance function not called or failing due to RLS
  - Proof: `is_passed=true` but no `user_certificates` row
4. **Certificate issued but lookup fails**
  - Likely lookup function/table not wired to verification page
  - Proof: DB returns verification_code row but UI verify page can’t find it

---

# Do this now (and paste results)

Run Emp1 pass fully. Then paste these 5 outputs:

1. Latest Emp1 `exam_checkins` row
2. Latest Emp1 `exam_attempts` row
3. Emp1 `user_certificates` latest row (+ verification_code)
4. Latest `security_audit_log` row for `exam_identity_verified`
5. Screenshot/text of the certificate lookup success (or the route + what it returns)

Then we’ll run Emp2 fail + confirm remediation + retake readiness.