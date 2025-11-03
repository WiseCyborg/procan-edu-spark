-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job processor to run every minute
SELECT cron.schedule(
  'process-jobs',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/jobs-processor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- Schedule SLO calculation every hour
SELECT cron.schedule(
  'calculate-slos',
  '0 * * * *',
  'SELECT calculate_slo_metrics()'
);

-- Schedule API request cleanup daily at 2 AM
SELECT cron.schedule(
  'cleanup-api-requests',
  '0 2 * * *',
  'SELECT cleanup_old_api_requests()'
);