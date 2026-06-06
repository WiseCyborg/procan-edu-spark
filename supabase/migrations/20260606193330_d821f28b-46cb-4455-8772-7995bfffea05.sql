-- Schedule comar-scrape-daily at 06:00 UTC.
-- The shared secret is fetched from vault.decrypted_secrets at runtime so it
-- never appears in source. Admin must populate vault entry 'cron_shared_secret'.

DO $$
DECLARE
  existing_jobid bigint;
BEGIN
  SELECT jobid INTO existing_jobid FROM cron.job WHERE jobname = 'comar-scrape-daily';
  IF existing_jobid IS NOT NULL THEN
    PERFORM cron.unschedule(existing_jobid);
  END IF;
END $$;

SELECT cron.schedule(
  'comar-scrape-daily',
  '0 6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/trigger-scrapers',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', COALESCE(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret' LIMIT 1),
        ''
      ),
      'x-invoked-by', 'pg_cron'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $cron$
);