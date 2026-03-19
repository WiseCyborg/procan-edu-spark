

# Launch Readiness: Full Role-Based QA and Missing Functionality

## Current State Assessment

The platform is extensive with 200+ edge functions, role-based dashboards (Student, Dispensary Manager, Training Coordinator, Admin), exam pipeline with photo check-in, certificate issuance, organization management, and seat allocation. The immediate blocker is the exam check-in 403 fix (already deployed but untested) and the need for systematic end-to-end validation.

## Phase 1: Fix Remaining Exam Pipeline Blockers

**Goal**: Get Emp1 PASS and Emp2 FAIL working end-to-end.

1. **Create a `start_exam_with_checkin` RPC** that atomically creates both the `exam_attempts` row and `exam_checkins` row in a single transaction. This eliminates the orphan-stub problem permanently, rather than relying on client-side rollback.

2. **Update `FinalExam.tsx`** to call the new RPC instead of two sequential inserts. The RPC returns the attempt_id and checkin_id.

3. **Add a `reset_exam_state` admin RPC** that cleans orphaned stubs for any user (not just Emp1), enabling repeatable testing.

**Files**: `supabase/migrations/new.sql`, `src/pages/Course/FinalExam.tsx`

## Phase 2: UAT Test Harness Page

**Goal**: Build an admin-only `/admin/uat-test-matrix` page that serves as a live test matrix with pass/fail tracking.

1. **Create `src/pages/admin/UATTestMatrix.tsx`** with a structured test matrix covering all roles and scenarios (IDs like UAT-MGMT-001, UAT-STU-001, etc.)

2. **Store results in a `uat_test_results` table** with columns: test_id, role, scenario, steps, expected_result, actual_result, status (pass/fail/blocked), notes, tested_by, tested_at.

3. **Pre-populate test cases** covering:
   - Management: login, dashboard metrics, user management, role assignment, certificate reporting
   - Org Admin: org-scoped learner view, enrollment, progress tracking, certificate access
   - Student: register/invite, login, course access, module completion, quiz, exam, certificate download
   - Permissions: cross-role access denial verification
   - Certificate: generation conditions, content accuracy, PDF download, verification portal

**Files**: `supabase/migrations/new.sql`, `src/pages/admin/UATTestMatrix.tsx`, `src/App.tsx` (new route)

## Phase 3: Dashboard Data Accuracy Audit

**Goal**: Ensure each dashboard shows real, accurate data.

1. **Admin Dashboard**: Verify `v_admin_global_metrics`, `v_admin_org_rollup` views return correct counts for total users, active students, dispensaries, certificates issued, completion rates.

2. **Manager Dashboard**: Verify org-scoped employee roster, seat utilization, completion analytics, at-risk students, exam check-in queue all reflect real DB state.

3. **Student Dashboard**: Verify progress percentage, module completion count, resume button, certificate download area all work with real `user_progress` and `course_completions` data.

4. **Fix any dashboard widgets showing `--` or placeholder data** by wiring them to actual queries.

**Files**: Various dashboard components, potentially new RPC functions

## Phase 4: Certificate Pipeline Hardening

**Goal**: Validate the full certificate lifecycle.

1. **Verify `evaluate_and_issue_certificate` RPC** correctly checks: 100% module completion, passing exam score (>=80%), and only issues one certificate per course per user.

2. **Verify certificate content**: correct student name, course name, completion date, verification code format (RVT-YYYYMM-XXXXXX).

3. **Verify PDF generation** via `generate-certificate` edge function produces a downloadable PDF.

4. **Verify public verification portal** (`/verify-certificate`) correctly validates codes and shows appropriate status (valid/expired/not found).

5. **Verify duplicate prevention**: calling certificate issuance twice for the same user+course does not create duplicate records.

**Files**: Certificate components, edge functions

## Phase 5: Permission and Security Validation

**Goal**: Confirm RLS and UI guards align.

1. **Student cannot access** `/admin`, `/dispensary-manager-dashboard`, `/training-coordinator` routes (verify `ProtectedRoute` + role checks).

2. **Manager cannot access** other organizations' data (verify RLS `organization_id` scoping).

3. **Admin can access** all dashboards and cross-org data.

4. **Verify `RequireAccess` guard** blocks course access for users without entitlements.

**Files**: Primarily verification, minor fixes if guards are missing

## Phase 6: Regression Testing and Launch Checklist

**Goal**: Full end-to-end pass with documented results.

1. **Run Test Sequence A** (Management → Student Completion): Create org, assign course, student completes all modules, passes exam, receives certificate, admin dashboard reflects it.

2. **Run Test Sequence C** (Failure/Recovery): Mid-course exit, resume, failed quiz retake, certificate blocked until all conditions pass.

3. **Document all results** in the UAT Test Matrix page with pass/fail and notes.

4. **Fix any regressions** found during testing and retest.

## Technical Details

### New RPC: `start_exam_with_checkin`
```sql
CREATE OR REPLACE FUNCTION public.start_exam_with_checkin(
  p_course_id uuid, p_photo_url text DEFAULT NULL,
  p_bypass_reason text DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_attempt_id uuid; v_checkin_id uuid;
  v_status text;
BEGIN
  v_status := CASE WHEN p_bypass_reason IS NOT NULL THEN 'bypassed' ELSE 'pending' END;
  INSERT INTO exam_attempts (user_id, course_id, ...) VALUES (auth.uid(), p_course_id, ...)
    RETURNING id INTO v_attempt_id;
  INSERT INTO exam_checkins (attempt_id, user_id, course_id, photo_url, status, bypass_reason)
    VALUES (v_attempt_id, auth.uid(), p_course_id, p_photo_url, v_status, p_bypass_reason)
    RETURNING id INTO v_checkin_id;
  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'checkin_id', v_checkin_id, 'status', v_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### UAT Test Matrix Table
```sql
CREATE TABLE public.uat_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL, -- e.g. UAT-STU-001
  role text NOT NULL,
  scenario text NOT NULL,
  steps text,
  expected_result text,
  actual_result text,
  status text DEFAULT 'pending', -- pending, pass, fail, blocked
  notes text,
  tested_by uuid REFERENCES auth.users(id),
  tested_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

### Priority Order
1. Phase 1 (exam fix) — unblocks all testing
2. Phase 2 (test matrix) — gives structure to track results
3. Phases 3-5 in parallel — dashboard, certificates, permissions
4. Phase 6 — final regression pass

