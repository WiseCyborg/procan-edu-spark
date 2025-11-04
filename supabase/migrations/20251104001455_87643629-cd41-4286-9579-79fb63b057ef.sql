-- Phase 1: Production Readiness Foundation
-- Helper function for idempotent cron scheduling
CREATE OR REPLACE FUNCTION public.schedule_if_missing(
  p_jobname text, 
  p_spec text, 
  p_sql text
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_jobname) THEN
    PERFORM cron.schedule(p_jobname, p_spec, p_sql);
  END IF;
END$$;

-- View: Queue health summary
CREATE OR REPLACE VIEW public.v_queue_health AS
SELECT 
  job_type,
  status,
  COUNT(*) AS ct,
  MIN(queued_at) AS oldest_queued_at,
  MAX(queued_at) AS newest_queued_at
FROM public.system_jobs
GROUP BY job_type, status;

-- View: Processor pulse monitoring
CREATE OR REPLACE VIEW public.v_processor_pulse AS
SELECT
  now() AS observed_at,
  (SELECT MAX(started_at) FROM system_jobs WHERE status IN ('processing','completed')) AS last_activity,
  (SELECT COUNT(*) FROM system_jobs WHERE status='queued') AS queued,
  (SELECT COUNT(*) FROM system_jobs WHERE status='failed') AS failed,
  (SELECT COUNT(*) FROM system_jobs_deadletter) AS deadletter;

-- Grant access to views
GRANT SELECT ON public.v_queue_health TO authenticated;
GRANT SELECT ON public.v_processor_pulse TO authenticated;

-- Schedule cron job 1: Process jobs every minute
SELECT public.schedule_if_missing(
  'process-jobs',
  '* * * * *',
  $$SELECT net.http_post(
     url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/jobs-processor',
     headers:='{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
     body:='{}'::jsonb
  )$$
);

-- Schedule cron job 2: Calculate SLO metrics hourly
SELECT public.schedule_if_missing(
  'calculate-slo-metrics',
  '0 * * * *',
  'SELECT public.calculate_slo_metrics()'
);

-- Schedule cron job 3: Cleanup old API requests daily at 2 AM
SELECT public.schedule_if_missing(
  'cleanup-api-requests',
  '0 2 * * *',
  'SELECT public.cleanup_old_api_requests()'
);

-- Schedule cron job 4: Queue canary job every 5 minutes
SELECT public.schedule_if_missing(
  'queue-canary',
  '*/5 * * * *',
  $$SELECT public.queue_job(
       p_job_type        := 'admin_alert',
       p_payload         := jsonb_build_object('alert_type','canary','ts',now()),
       p_idempotency_key := 'canary_' || to_char(now(),'YYYYMMDD_HH24MI')
     )$$
);