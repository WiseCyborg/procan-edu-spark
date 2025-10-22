-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Maryland regulations scraping (daily at 3 AM EST)
SELECT cron.schedule(
  'scrape-maryland-regulations-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/scrape-regulations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Schedule: Federal regulations scraping (weekly on Mondays at 4 AM EST)
SELECT cron.schedule(
  'scrape-federal-regulations-weekly',
  '0 4 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/scrape-federal-regulations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Schedule: Daily owner digest (daily at 8 AM EST)
SELECT cron.schedule(
  'generate-daily-owner-digest',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/generate-daily-digest',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Schedule: Email health check (every hour)
SELECT cron.schedule(
  'email-health-check-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/test-email-providers',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Schedule: Workflow automations (every 6 hours)
SELECT cron.schedule(
  'execute-workflow-automations',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/execute-workflow-automations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Schedule: Revenue analysis (every 6 hours)
SELECT cron.schedule(
  'analyze-payment-patterns',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/analyze-payment-patterns',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzUyNTcsImV4cCI6MjA2MDc1MTI1N30.Fuy8xXz3g9hyDNSMO2GmKPDIOnm5tGZsF7H_jmwtoVA"}'::jsonb,
    body := '{"scheduled": true}'::jsonb
  );
  $$
);

-- Create database indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_created ON ai_agent_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_agent_runs_agent_name ON ai_agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_unresolved ON compliance_alerts(resolved, created_at) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_email_logs_created ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);