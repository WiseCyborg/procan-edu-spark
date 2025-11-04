-- Fix security issues: Add search_path to functions and fix view security

-- Drop and recreate calculate_next_retake_time with proper search_path
DROP FUNCTION IF EXISTS calculate_next_retake_time(UUID, UUID, INTEGER);

CREATE OR REPLACE FUNCTION calculate_next_retake_time(
  p_user_id UUID,
  p_course_id UUID,
  p_cooldown_hours INTEGER DEFAULT 24
)
RETURNS TIMESTAMPTZ 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_attempt TIMESTAMPTZ;
BEGIN
  -- Get the most recent exam attempt
  SELECT created_at INTO v_last_attempt
  FROM public.exam_attempts
  WHERE user_id = p_user_id 
    AND course_id = p_course_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no previous attempt, can take immediately
  IF v_last_attempt IS NULL THEN
    RETURN now();
  END IF;
  
  -- Calculate next available time
  RETURN v_last_attempt + (p_cooldown_hours || ' hours')::INTERVAL;
END;
$$;

-- Fix set_exam_retake_time trigger function with search_path
DROP FUNCTION IF EXISTS set_exam_retake_time() CASCADE;

CREATE OR REPLACE FUNCTION set_exam_retake_time()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.can_retake_at := NEW.created_at + (COALESCE(NEW.retake_cooldown_hours, 24) || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER exam_attempts_set_retake_time
  BEFORE INSERT ON public.exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_exam_retake_time();

-- Drop and recreate view without SECURITY DEFINER (use RLS instead)
DROP VIEW IF EXISTS public.user_exam_stats;

CREATE VIEW public.user_exam_stats 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  course_id,
  COUNT(*) as total_attempts,
  COUNT(*) FILTER (WHERE is_passed = true) as passed_attempts,
  COUNT(*) FILTER (WHERE is_passed = false) as failed_attempts,
  MAX(total_score) as best_score,
  AVG(total_score) as average_score,
  MIN(created_at) as first_attempt_date,
  MAX(created_at) as last_attempt_date,
  MAX(can_retake_at) as next_retake_available,
  CASE 
    WHEN MAX(can_retake_at) > now() THEN false
    ELSE true
  END as can_retake_now
FROM public.exam_attempts
GROUP BY user_id, course_id;

-- Grant access to the view
GRANT SELECT ON public.user_exam_stats TO authenticated;
GRANT SELECT ON public.user_exam_stats TO service_role;

-- Add RLS policy to view (via underlying table policies)
-- The view will inherit RLS from exam_attempts table