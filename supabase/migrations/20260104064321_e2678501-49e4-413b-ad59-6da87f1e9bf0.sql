-- ============================================
-- Multi-Role Idempotency Hardening
-- ============================================

-- 1. Add unique constraint on user_learning_journey to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS user_learning_journey_user_org_unique 
ON public.user_learning_journey (user_id, organization_id);

-- 2. Update user_learning_journey inserts to be upserts
-- Create a function to safely upsert learning journey
CREATE OR REPLACE FUNCTION public.safe_upsert_learning_journey(
  p_user_id UUID,
  p_organization_id UUID,
  p_current_stage TEXT DEFAULT 'registered'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey_id UUID;
BEGIN
  -- Try to insert, on conflict update
  INSERT INTO user_learning_journey (
    user_id,
    organization_id,
    current_stage,
    stage_entered_at,
    last_activity_at,
    completion_percentage,
    modules_completed,
    exam_attempts,
    at_risk_flag
  ) VALUES (
    p_user_id,
    p_organization_id,
    p_current_stage,
    NOW(),
    NOW(),
    0,
    0,
    0,
    false
  )
  ON CONFLICT (user_id, organization_id) 
  DO UPDATE SET
    last_activity_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_journey_id;
  
  RETURN v_journey_id;
END;
$$;

-- 3. Create function to safely upsert user_progress (module completions)
CREATE OR REPLACE FUNCTION public.safe_complete_module(
  p_user_id UUID,
  p_course_id UUID,
  p_module_id UUID,
  p_score INTEGER DEFAULT 100,
  p_time_spent INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_progress_id UUID;
BEGIN
  INSERT INTO user_progress (
    user_id,
    course_id,
    module_id,
    is_completed,
    score,
    time_spent,
    completed_at
  ) VALUES (
    p_user_id,
    p_course_id,
    p_module_id,
    true,
    p_score,
    p_time_spent,
    NOW()
  )
  ON CONFLICT (user_id, module_id) 
  DO UPDATE SET
    is_completed = true,
    score = GREATEST(user_progress.score, EXCLUDED.score),
    time_spent = user_progress.time_spent + EXCLUDED.time_spent,
    completed_at = COALESCE(user_progress.completed_at, NOW()),
    updated_at = NOW()
  RETURNING id INTO v_progress_id;
  
  RETURN v_progress_id;
END;
$$;

-- 4. Fix deprecated current_setting calls by creating replacement trigger
-- Drop the old triggers that use current_setting
DROP TRIGGER IF EXISTS on_exam_passed ON public.exam_attempts;
DROP FUNCTION IF EXISTS public.handle_exam_passed();

-- Create a new safer trigger that doesn't use current_setting
CREATE OR REPLACE FUNCTION public.handle_exam_passed_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger on pass
  IF NEW.is_passed = true AND (OLD IS NULL OR OLD.is_passed = false) THEN
    -- Queue certificate email job instead of direct HTTP call
    PERFORM queue_job(
      'send_certificate_email',
      jsonb_build_object(
        'exam_attempt_id', NEW.id,
        'user_id', NEW.user_id,
        'course_id', NEW.course_id,
        'score', NEW.total_score
      ),
      'cert_email_' || NEW.id::text,
      NULL,
      3
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Note: Not re-creating trigger as certificate email is already sent by generate-certificate function

-- 5. Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.safe_upsert_learning_journey(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.safe_complete_module(UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated;