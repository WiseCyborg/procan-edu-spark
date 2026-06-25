
-- Public-safe activity stats RPC for the landing-page ticker.
CREATE OR REPLACE FUNCTION public.get_public_activity_stats(p_limit int DEFAULT 5)
RETURNS TABLE (passed_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at AS passed_at
  FROM public.exam_attempts
  WHERE is_passed = true
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(p_limit, 20));
$$;

REVOKE ALL ON FUNCTION public.get_public_activity_stats(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_activity_stats(int) TO anon, authenticated;

-- Purge obsolete deadletter rows whose handler is now registered.
DELETE FROM public.system_jobs_deadletter
WHERE job_type = 'seat_utilization_alert';
