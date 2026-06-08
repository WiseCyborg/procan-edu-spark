CREATE OR REPLACE FUNCTION public.get_last_comar_review()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT created_at
  FROM public.ai_agent_runs
  WHERE agent_name = 'COMAR Compliance Monitor'
    AND execution_status = 'success'
  ORDER BY created_at DESC
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_last_comar_review() TO anon, authenticated;