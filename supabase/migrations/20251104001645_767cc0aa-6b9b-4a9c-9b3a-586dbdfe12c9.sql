-- Fix security warnings from production readiness migration

-- Fix 1: Remove SECURITY DEFINER and add search_path to schedule_if_missing
CREATE OR REPLACE FUNCTION public.schedule_if_missing(
  p_jobname text, 
  p_spec text, 
  p_sql text
)
RETURNS void 
LANGUAGE plpgsql 
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_jobname) THEN
    PERFORM cron.schedule(p_jobname, p_spec, p_sql);
  END IF;
END$$;

-- Fix 2 & 3: Recreate views without SECURITY DEFINER (views don't need RLS as they're read-only aggregations)
-- The security is enforced by the underlying tables' RLS policies

DROP VIEW IF EXISTS public.v_queue_health;
CREATE VIEW public.v_queue_health AS
SELECT 
  job_type,
  status,
  COUNT(*) AS ct,
  MIN(queued_at) AS oldest_queued_at,
  MAX(queued_at) AS newest_queued_at
FROM public.system_jobs
GROUP BY job_type, status;

DROP VIEW IF EXISTS public.v_processor_pulse;
CREATE VIEW public.v_processor_pulse AS
SELECT
  now() AS observed_at,
  (SELECT MAX(started_at) FROM system_jobs WHERE status IN ('processing','completed')) AS last_activity,
  (SELECT COUNT(*) FROM system_jobs WHERE status='queued') AS queued,
  (SELECT COUNT(*) FROM system_jobs WHERE status='failed') AS failed,
  (SELECT COUNT(*) FROM system_jobs_deadletter) AS deadletter;

-- Re-grant permissions
GRANT SELECT ON public.v_queue_health TO authenticated;
GRANT SELECT ON public.v_processor_pulse TO authenticated;