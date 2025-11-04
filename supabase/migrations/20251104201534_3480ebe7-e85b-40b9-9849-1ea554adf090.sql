-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension if not already enabled  
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule AI Content Optimizer to run every Monday at 9 AM UTC
SELECT cron.schedule(
  'weekly-ai-content-optimizer',
  '0 9 * * 1', -- Every Monday at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
        url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-content-optimizer',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to manually trigger the optimizer (for testing)
CREATE OR REPLACE FUNCTION public.trigger_optimizer_now()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-content-optimizer',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
    body:='{"manual": true}'::jsonb
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users (will be restricted by RLS)
GRANT EXECUTE ON FUNCTION public.trigger_optimizer_now() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.trigger_optimizer_now() IS 'Manually trigger the AI content optimizer analysis';