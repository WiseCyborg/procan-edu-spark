-- Update pg_cron jobs to use service role key instead of anon key
-- Drop existing cron jobs
SELECT cron.unschedule('weekly-curriculum-optimizer');
SELECT cron.unschedule('daily-competitor-check');

-- Recreate with service role authentication
SELECT cron.schedule(
  'weekly-curriculum-optimizer',
  '0 22 * * 5',  -- Friday at 10 PM EST
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-curriculum-optimizer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

SELECT cron.schedule(
  'daily-competitor-check',
  '0 3 * * *',  -- Daily at 3 AM EST
  $$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-curriculum-optimizer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);