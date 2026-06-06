-- Helper RPC for scheduling the COMAR scrape cron job with the secret pulled
-- from the edge function env (never written to source). Service-role only.

CREATE OR REPLACE FUNCTION public.setup_comar_scrape_cron(secret text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, net
AS $$
DECLARE
  job_url text := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/trigger-scrapers';
  headers_json jsonb;
BEGIN
  IF secret IS NULL OR length(secret) < 16 THEN
    RAISE EXCEPTION 'secret too short';
  END IF;

  headers_json := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', secret,
    'x-invoked-by', 'pg_cron'
  );

  -- Remove prior schedule, if any
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'comar-scrape-daily';

  PERFORM cron.schedule(
    'comar-scrape-daily',
    '0 6 * * *',
    format($cmd$
      SELECT net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := '{}'::jsonb
      ) AS request_id;
    $cmd$, job_url, headers_json::text)
  );

  RETURN 'comar-scrape-daily scheduled at 06:00 UTC';
END;
$$;

REVOKE ALL ON FUNCTION public.setup_comar_scrape_cron(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.setup_comar_scrape_cron(text) TO service_role;