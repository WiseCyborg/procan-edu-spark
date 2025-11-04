-- Add retake cooldown tracking to exam_attempts
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS can_retake_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS retake_cooldown_hours INTEGER DEFAULT 24;

-- Create index for efficient cooldown queries
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_retake ON public.exam_attempts(user_id, can_retake_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_created ON public.exam_attempts(user_id, created_at DESC);

-- Function to calculate next retake time
CREATE OR REPLACE FUNCTION calculate_next_retake_time(
  p_user_id UUID,
  p_course_id UUID,
  p_cooldown_hours INTEGER DEFAULT 24
)
RETURNS TIMESTAMPTZ AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically set can_retake_at on insert
CREATE OR REPLACE FUNCTION set_exam_retake_time()
RETURNS TRIGGER AS $$
BEGIN
  NEW.can_retake_at := NEW.created_at + (COALESCE(NEW.retake_cooldown_hours, 24) || ' hours')::INTERVAL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS exam_attempts_set_retake_time ON public.exam_attempts;
CREATE TRIGGER exam_attempts_set_retake_time
  BEFORE INSERT ON public.exam_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_exam_retake_time();

-- Create view for exam statistics per user
CREATE OR REPLACE VIEW public.user_exam_stats AS
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