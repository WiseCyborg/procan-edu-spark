-- Safe public RPC for the landing-page activity ticker.
-- Returns ONLY anonymized recent certificate timestamps (no user_id, no PII).
CREATE OR REPLACE FUNCTION public.get_recent_certificate_activity(_limit int DEFAULT 5)
RETURNS TABLE(created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at
  FROM public.exam_attempts
  WHERE is_passed = true
  ORDER BY created_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 20));
$$;

REVOKE ALL ON FUNCTION public.get_recent_certificate_activity(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recent_certificate_activity(int) TO anon, authenticated;