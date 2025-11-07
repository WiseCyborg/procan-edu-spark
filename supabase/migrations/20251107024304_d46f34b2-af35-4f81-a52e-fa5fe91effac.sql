-- Schedule daily COMAR compliance check at 8 AM
SELECT cron.schedule(
  'comar-compliance-check-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/check-comar-compliance',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);