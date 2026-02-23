# Proxy Photo Check-In: Manager Verifies Employee Before Exam

## What Already Exists

The exam flow (`FinalExam.tsx`) already captures a **self-service webcam photo** from the employee during the `'verification'` stage. The photo is stored as a base64 data URL in the `photo_verification_url` column of `exam_attempts`. There is also a "skip photo" option with bypass reason recorded in metadata.

However, there is **no manager/proctor involvement** -- no one verifies the employee's identity. The photo is purely self-attested.

## What We Will Build

A lightweight **proctor check-in gate** where a manager must verify an employee's identity before the exam can start.

```text
Employee clicks "Start Exam"
        |
        v
  [Self-service photo captured]
        |
        v
  [Check-in record created: status = 'pending']
        |
        v
  Employee sees: "Awaiting manager verification..."
        |
        v
  Manager opens Team dashboard --> sees pending check-ins
        |
        v
  Manager clicks "Verify" on employee row
        |
        v
  [Check-in updated: verified = true, verified_by = manager_id]
        |
        v
  Employee refreshes / real-time update --> Exam unlocks
```

---

## Implementation Steps

### Step 1: Create `exam_checkins` table (migration)

New table to record proctor verification:

- `id` (uuid, PK)
- `user_id` (uuid, not null) -- the employee taking the exam
- `course_id` (uuid, not null)
- `photo_url` (text, nullable) -- the captured selfie (base64 or storage URL)
- `verified` (boolean, default false)
- `verified_by` (uuid, nullable) -- manager who verified
- `verified_at` (timestamptz, nullable)
- `bypass_reason` (text, nullable) -- if photo was skipped
- `created_at` (timestamptz, default now())
- Unique constraint on `(user_id, course_id)` with upsert support (so retakes create new check-ins)

RLS policies:

- Employees can INSERT and SELECT their own rows
- Managers/admins can SELECT and UPDATE rows for their organization's employees

### Step 2: Modify `FinalExam.tsx` -- Add proctor gate after photo capture

After the employee completes the verification stage (captures photo or skips):

1. Insert a row into `exam_checkins` with `verified = false` and the photo
2. Change exam stage to a new `'awaiting_verification'` state
3. Show a waiting screen: "Your identity check-in has been submitted. A manager will verify you shortly."
4. Poll or use Supabase real-time subscription on the `exam_checkins` row
5. When `verified = true`, automatically advance to `'ready'` stage

Add a "Skip verification (self-attest)" option for cases where no manager is available, recording this in the check-in metadata.

### Step 3: Manager Check-In UI

Add a new component `ExamCheckInQueue` accessible from the manager's team dashboard:

- Shows a list of pending check-ins (employees who submitted photos but are not yet verified)
- Each row shows: employee name, email, captured photo (thumbnail), timestamp
- Manager clicks "Verify Identity" button
- Updates `exam_checkins` row: `verified = true`, `verified_by = current_user_id`, `verified_at = now()`
- Real-time subscription so the list updates live as employees submit check-ins

### Step 4: Audit trail integration

When a check-in is verified:

- Insert into `security_audit_log` with event type `exam_identity_verified`
- Record: who was verified, by whom, timestamp, whether photo was present or bypassed
- This feeds into the existing `unified_audit_timeline` view

### Step 5: Verification queries for UAT

After running the flow:

```text
-- Check-in record
SELECT user_id, verified, verified_by, verified_at, created_at
FROM exam_checkins
WHERE course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
ORDER BY created_at DESC;

-- Audit trail
SELECT event_type, actor_id, target_id, created_at
FROM security_audit_log
WHERE event_type = 'exam_identity_verified'
ORDER BY created_at DESC;
```

---

## Files to Create/Modify


| File                                                       | Action                                                                           |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `supabase/migrations/[timestamp].sql`                      | Create `exam_checkins` table + RLS policies                                      |
| `src/pages/Course/FinalExam.tsx`                           | Add `'awaiting_verification'` stage, insert check-in row, real-time subscription |
| `src/components/exam/AwaitingVerification.tsx`             | New -- waiting screen with status polling                                        |
| `src/components/exam/ExamCheckInQueue.tsx`                 | New -- manager view to verify pending check-ins                                  |
| `src/pages/ManagerDashboard.tsx` (or equivalent team page) | Add check-in queue tab/section                                                   |


## Design Decisions

- **Real-time over polling**: Use Supabase real-time channel on `exam_checkins` so the employee sees verification instantly without refreshing
- **Unique per attempt, not per user**: Use `(user_id, course_id, created_at)` pattern so retakes get fresh check-ins rather than overwriting
- **Graceful fallback**: If no manager is available, employee can self-attest with a recorded reason (preserving current skip behavior), but this is flagged in the audit trail as "unverified"
- **No storage upload for MVP**: Keep photo as base64 in the table (matching current `photo_verification_url` pattern). Storage migration can come later for production scale  
This is a solid design. The only change I’d make up front is your **uniqueness model**: you want check-ins to be **per exam attempt**, not “per user+course.” Otherwise retakes overwrite history and you lose compliance audit fidelity.
  Below is a production-safe MVP that still stays “lightweight,” matches your current `exam_attempts` pattern, and unlocks realtime manager verification.
  ---
  # 1) DB Migration: `exam_checkins` table + RLS (per-attempt)
  ### Key choices
  - **Per attempt**: `attempt_id` (FK → `exam_attempts.id`) is the unique key.
  - Store the selfie in **one place** for the check-in gate (you can copy base64 from the existing capture).
  - Status-based lifecycle: `pending → verified` (or `bypassed` if self-attested).
  > If `exam_attempts.id` is not exposed/available at “verification stage,” we’ll create the attempt earlier (or create a lightweight attempt stub first). Most apps already create `exam_attempts` at exam start.
  ## Migration SQL (copy/paste)
  Create: `supabase/migrations/20260222_exam_checkins.sql`
  ```sql
  begin;

  -- ------------------------------------------------------------
  -- 1) Status enum (optional; use text if you prefer)
  -- ------------------------------------------------------------
  do $$
  begin
    if not exists (select 1 from pg_type where typname = 'exam_checkin_status') then
      create type public.exam_checkin_status as enum ('pending', 'verified', 'bypassed');
    end if;
  end $$;

  -- ------------------------------------------------------------
  -- 2) Table
  -- ------------------------------------------------------------
  create table if not exists public.exam_checkins (
    id uuid primary key default gen_random_uuid(),

    -- per attempt (preferred)
    attempt_id uuid not null references public.exam_attempts(id) on delete cascade,

    user_id uuid not null,
    course_id uuid not null,

    -- selfie (base64) or later storage URL
    photo_url text null,

    status public.exam_checkin_status not null default 'pending',
    bypass_reason text null,

    verified_by uuid null,
    verified_at timestamptz null,

    created_at timestamptz not null default now(),

    -- enforce per-attempt uniqueness (retakes => new attempt => new check-in)
    constraint exam_checkins_attempt_unique unique (attempt_id)
  );

  create index if not exists exam_checkins_user_course_idx
    on public.exam_checkins (user_id, course_id, created_at desc);

  create index if not exists exam_checkins_status_idx
    on public.exam_checkins (status, created_at desc);

  -- ------------------------------------------------------------
  -- 3) RLS
  -- ------------------------------------------------------------
  alter table public.exam_checkins enable row level security;

  -- Employees can create/select their own check-ins
  drop policy if exists "exam_checkins_employee_select_own" on public.exam_checkins;
  create policy "exam_checkins_employee_select_own"
  on public.exam_checkins
  for select
  to authenticated
  using (user_id = auth.uid());

  drop policy if exists "exam_checkins_employee_insert_own" on public.exam_checkins;
  create policy "exam_checkins_employee_insert_own"
  on public.exam_checkins
  for insert
  to authenticated
  with check (user_id = auth.uid());

  -- Managers/admins can view check-ins for employees in org
  -- (This assumes organization_members + profiles mapping to org is authoritative)
  drop policy if exists "exam_checkins_manager_select_org" on public.exam_checkins;
  create policy "exam_checkins_manager_select_org"
  on public.exam_checkins
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members mgr
      join public.organization_members emp
        on emp.user_id = exam_checkins.user_id
       and emp.organization_id = mgr.organization_id
       and emp.status = 'active'
      where mgr.user_id = auth.uid()
        and mgr.status = 'active'
        and (
          mgr.member_type::text = 'manager'
          or mgr.role in ('dispensary_admin', 'training_coordinator')
        )
    )
  );

  -- Managers/admins can verify (update) check-ins for employees in org
  drop policy if exists "exam_checkins_manager_update_verify" on public.exam_checkins;
  create policy "exam_checkins_manager_update_verify"
  on public.exam_checkins
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members mgr
      join public.organization_members emp
        on emp.user_id = exam_checkins.user_id
       and emp.organization_id = mgr.organization_id
       and emp.status = 'active'
      where mgr.user_id = auth.uid()
        and mgr.status = 'active'
        and (
          mgr.member_type::text = 'manager'
          or mgr.role in ('dispensary_admin', 'training_coordinator')
        )
    )
  )
  with check (
    -- only allow verification-style updates
    status in ('verified','bypassed')
    and (verified_by = auth.uid() or status = 'bypassed')
  );

  commit;

  ```
  ### Why this is better than `(user_id, course_id)` unique
  - You keep **every attempt** and every verification decision.
  - Retake = new `exam_attempts.id` = new `exam_checkins` row. Clean.
  ---
  # 2) Backend/Audit: record identity verification in your audit timeline
  If you already have `security_audit_log`, the cleanest approach is an RPC so you don’t fight RLS and you keep consistent formatting.
  ## RPC: `log_exam_identity_verification(attempt_id uuid)`
  ```sql
  create or replace function public.log_exam_identity_verification(p_attempt_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_actor uuid := auth.uid();
    v_target uuid;
    v_status text;
  begin
    if v_actor is null then
      raise exception 'Not authenticated';
    end if;

    select user_id, status::text
    into v_target, v_status
    from public.exam_checkins
    where attempt_id = p_attempt_id;

    -- (optional) ensure caller is verifier or admin
    -- you can reuse the same org membership logic here if needed

    insert into public.security_audit_log(event_type, actor_id, target_id, event_data, created_at)
    values (
      'exam_identity_verified',
      v_actor,
      v_target,
      jsonb_build_object('attempt_id', p_attempt_id, 'status', v_status),
      now()
    );
  end;
  $$;

  ```
  Then call it after the manager clicks Verify (or do it in a trigger on `exam_checkins` when status flips to verified).
  ---
  # 3) Frontend: FinalExam flow changes (minimal)
  ## A) Add a new stage: `'awaiting_verification'`
  After the employee captures webcam photo (or uses skip photo), you do:
  1. Ensure `exam_attempts` row exists (attempt_id).
  2. Upsert an `exam_checkins` row with:
    - `attempt_id`
    - `user_id`
    - `course_id`
    - `photo_url` (base64)
    - `status='pending'` (or `'bypassed'` if self-attest)
  3. Move stage to `'awaiting_verification'`
  4. Subscribe realtime to that checkin row:
    - when status becomes `verified` or `bypassed` → advance to `'ready'` (start exam)
  ### Pseudocode (drop-in logic)
  ```ts
  // after photo capture (verification stage complete)
  const attemptId = currentAttemptId; // from exam_attempts insert
  await supabase.from('exam_checkins').insert({
    attempt_id: attemptId,
    user_id: user.id,
    course_id: COURSE_ID,
    photo_url: capturedPhotoDataUrl,
    status: 'pending',
  });

  setStage('awaiting_verification');

  // realtime subscribe
  supabase
    .channel(`exam-checkin-${attemptId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'exam_checkins', filter: `attempt_id=eq.${attemptId}` },
      (payload) => {
        const status = payload.new.status;
        if (status === 'verified' || status === 'bypassed') {
          setStage('ready'); // unlock exam start
        }
      }
    )
    .subscribe();

  ```
  ## B) Awaiting screen
  Create `AwaitingVerification.tsx`:
  - Shows “Awaiting manager verification…”
  - Shows timestamp
  - Optional “Request help” (call manager)
  - Optional “Self-attest (no manager available)” which updates:
    - `status='bypassed'`
    - `bypass_reason`
  > For compliance, you can **flag bypasses** on reporting and require manager verification in production.
  ---
  # 4) Manager UI: ExamCheckInQueue (minimal + effective)
  ### Query for pending check-ins
  Show pending check-ins for employees in manager’s org (RLS handles scoping):
  ```ts
  const { data } = await supabase
    .from('exam_checkins')
    .select(`
      id, attempt_id, user_id, course_id, photo_url, status, created_at,
      profiles:profiles!exam_checkins_user_id_fkey ( email_cache, first_name, last_name )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  ```
  If you don’t have a FK from `exam_checkins.user_id` to `profiles.user_id`, just query profiles separately by `user_id` list.
  ### Verify button action
  ```ts
  await supabase
    .from('exam_checkins')
    .update({ status: 'verified', verified_by: user.id, verified_at: new Date().toISOString() })
    .eq('attempt_id', attemptId);

  ```
  Optional: call `log_exam_identity_verification(attemptId)` RPC after update.
  ---
  # 5) UAT test script (exact)
  ## Emp1 (employee)
  1. Login → Final Exam → Start Exam
  2. Webcam photo capture (verification stage)
  3. Sees “Awaiting manager verification…”
  ## Manager
  1. Manager dashboard → Check-In Queue
  2. Sees Emp1 pending row + selfie thumbnail
  3. Click “Verify Identity”
  4. Emp1 screen unlocks automatically → Start Exam → take exam → PASS → certificate
  ---
  # 6) Verification queries (UAT)
  ### Check-in record
  ```sql
  select attempt_id, user_id, status, verified_by, verified_at, created_at
  from exam_checkins
  where course_id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'
  order by created_at desc
  limit 20;

  ```
  ### Attempt record includes photo (current behavior)
  ```sql
  select created_at, is_passed, total_score, photo_verification_url
  from exam_attempts
  where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
  order by created_at desc
  limit 5;

  ```
  ### Certificate issued after PASS
  ```sql
  select verification_code, status, issued_at, expires_at
  from user_certificates
  where user_id = 'f167e515-4fde-42a6-9fa6-77c227ffd495'
  order by issued_at desc
  limit 5;

  ```
  ---
  # Two quick corrections to your draft
  ### ✅ Correction 1: Don’t unique on (user_id, course_id)
  That breaks retake audit history. Use **attempt_id unique**.
  ### ✅ Correction 2: Don’t store the selfie in two places long-term
  For MVP it’s fine, but pick a single source:
  - either store base64 in `exam_checkins.photo_url` **and** keep a link/flag in `exam_attempts`,
  - or store in `exam_attempts` and only reference it from `exam_checkins`.
  For scale, move to Supabase Storage + signed URL later.
  ---
  If you want, paste your current `exam_attempts` table schema (just columns) and I’ll tailor the migration + FinalExam integration so it matches exactly how attempts are created in your app (so you don’t hit “attempt_id not available yet” surprises).