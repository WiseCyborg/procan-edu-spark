-- ================================================================
-- PHASE 1: Schedule Dormant AI Agents with Cron Jobs
-- ================================================================
-- This migration adds cron schedules for AI agents that were coded but never scheduled
-- These agents are critical for the platform's intelligent automation and user experience

-- Helper function to safely schedule if not exists
CREATE OR REPLACE FUNCTION schedule_if_missing(p_jobname text, p_spec text, p_sql text)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = p_jobname) THEN
    PERFORM cron.schedule(p_jobname, p_spec, p_sql);
  END IF;
END$$;

-- ================================================================
-- Schedule: Enrollment Lifecycle Agent (every 6 hours)
-- ================================================================
-- Monitors user progress and triggers intervention emails at key lifecycle stages
-- Runs: Every 6 hours (00:00, 06:00, 12:00, 18:00)
SELECT schedule_if_missing(
  'enrollment-lifecycle-agent',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/enrollment-lifecycle-agent',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ================================================================
-- Schedule: At-Risk Student Agent (daily at 7 AM)
-- ================================================================
-- Identifies students falling behind and alerts organization managers
-- Runs: Daily at 7:00 AM EST
SELECT schedule_if_missing(
  'ai-at-risk-agent-daily',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-at-risk-agent',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ================================================================
-- Schedule: Seat Utilization Agent (weekly Monday 8 AM)
-- ================================================================
-- Analyzes seat usage and alerts organizations with low utilization
-- Runs: Every Monday at 8:00 AM EST
SELECT schedule_if_missing(
  'ai-seat-utilization-weekly',
  '0 8 * * 1',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-seat-utilization-agent',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ================================================================
-- Schedule: RVT Renewal Monitor (daily at 9 AM)
-- ================================================================
-- Monitors certificate expiration and triggers renewal reminders
-- Runs: Daily at 9:00 AM EST (agent self-skips outside Oct-Dec renewal season)
SELECT schedule_if_missing(
  'rvt-renewal-monitor-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-rvt-renewal-monitor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ================================================================
-- Schedule: RVT Competitor Monitor (daily at 4 AM)
-- ================================================================
-- Scans MCA-approved competitor websites for pricing/feature changes
-- Runs: Daily at 4:00 AM EST
SELECT schedule_if_missing(
  'ai-rvt-competitor-monitor-daily',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/ai-rvt-competitor-monitor',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);

-- ================================================================
-- PHASE 2: Verify Cron Jobs Are Active
-- ================================================================
-- Query to check all AI agent cron jobs are scheduled:
-- SELECT jobname, schedule, active, command FROM cron.job WHERE jobname LIKE '%agent%' OR jobname LIKE '%monitor%' ORDER BY jobname;

-- Expected results after migration:
-- ✅ enrollment-lifecycle-agent (0 */6 * * *)
-- ✅ ai-at-risk-agent-daily (0 7 * * *)
-- ✅ ai-seat-utilization-weekly (0 8 * * 1)
-- ✅ rvt-renewal-monitor-daily (0 9 * * *)
-- ✅ ai-rvt-competitor-monitor-daily (0 4 * * *)

-- ================================================================
-- PHASE 3: Expected Impact
-- ================================================================
-- After this migration, the following AI agents will begin running automatically:
--
-- 1. Enrollment Lifecycle Agent - Sends welcome emails, progress nudges, completion reminders
-- 2. At-Risk Agent - Alerts managers when students are falling behind
-- 3. Seat Utilization Agent - Notifies orgs with low seat usage (upsell opportunity)
-- 4. RVT Renewal Monitor - Triggers annual renewal reminders (Oct-Dec only)
-- 5. RVT Competitor Monitor - Tracks competitor pricing/features for market intelligence
--
-- These agents automate critical user engagement, retention, and business intelligence workflows.