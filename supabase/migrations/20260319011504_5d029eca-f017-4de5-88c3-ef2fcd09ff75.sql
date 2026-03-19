
-- Phase 1: Atomic RPC to create exam attempt + check-in in one transaction
CREATE OR REPLACE FUNCTION public.start_exam_with_checkin(
  p_course_id uuid,
  p_photo_url text DEFAULT NULL,
  p_bypass_reason text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_attempt_id uuid;
  v_checkin_id uuid;
  v_checkin_status text;
  v_attempt_number int;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Calculate attempt number
  SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO v_attempt_number
    FROM exam_attempts
    WHERE user_id = v_user_id AND course_id = p_course_id;

  -- Determine check-in status
  v_checkin_status := CASE WHEN p_bypass_reason IS NOT NULL THEN 'bypassed' ELSE 'pending' END;

  -- Create exam attempt stub
  INSERT INTO exam_attempts (
    user_id, course_id, total_score, passing_score, is_passed,
    time_taken, photo_verification_url, ip_address, attempt_number,
    metadata, previous_attempt_count
  ) VALUES (
    v_user_id, p_course_id, 0, 80, false,
    0, p_photo_url, p_ip_address, v_attempt_number,
    p_metadata, v_attempt_number - 1
  )
  RETURNING id INTO v_attempt_id;

  -- Create check-in row
  INSERT INTO exam_checkins (
    attempt_id, user_id, course_id, photo_url, status, bypass_reason
  ) VALUES (
    v_attempt_id, v_user_id, p_course_id, p_photo_url, v_checkin_status, p_bypass_reason
  )
  RETURNING id INTO v_checkin_id;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt_id,
    'checkin_id', v_checkin_id,
    'status', v_checkin_status,
    'attempt_number', v_attempt_number
  );
END;
$$;

-- Phase 1: Admin RPC to reset exam state for repeatable testing
CREATE OR REPLACE FUNCTION public.reset_exam_state(
  p_target_user_id uuid,
  p_course_id uuid DEFAULT 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid;
  v_deleted_checkins int;
  v_deleted_attempts int;
BEGIN
  v_caller_id := auth.uid();
  -- Only admins can reset exam state
  IF NOT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = v_caller_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  -- Delete check-ins first (FK dependency)
  DELETE FROM exam_checkins
    WHERE user_id = p_target_user_id AND course_id = p_course_id;
  GET DIAGNOSTICS v_deleted_checkins = ROW_COUNT;

  -- Delete attempts
  DELETE FROM exam_attempts
    WHERE user_id = p_target_user_id AND course_id = p_course_id;
  GET DIAGNOSTICS v_deleted_attempts = ROW_COUNT;

  RETURN jsonb_build_object(
    'deleted_checkins', v_deleted_checkins,
    'deleted_attempts', v_deleted_attempts,
    'target_user_id', p_target_user_id,
    'course_id', p_course_id
  );
END;
$$;

-- Phase 2: UAT Test Results table
CREATE TABLE IF NOT EXISTS public.uat_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id text NOT NULL,
  role text NOT NULL,
  scenario text NOT NULL,
  steps text,
  expected_result text,
  actual_result text,
  status text NOT NULL DEFAULT 'pending',
  notes text,
  tested_by uuid REFERENCES auth.users(id),
  tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uat_test_results ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write UAT results
CREATE POLICY "Admins can manage UAT results"
  ON public.uat_test_results
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
