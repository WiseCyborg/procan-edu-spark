-- ============================================================
-- FIX 2: Create All Missing Cron Jobs
-- Enable automated email scheduling and monitoring
-- ============================================================

-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Process Notification Queue (every 2 minutes)
SELECT cron.schedule(
  'process-notification-queue',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/process-notification-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb
  ) as request_id;
  $$
);

-- 2. Check Payment Deadlines (daily at 9 AM)
SELECT cron.schedule(
  'schedule-payment-reminders',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/check-payment-deadlines',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb
  ) as request_id;
  $$
);

-- 3. Check Certificate Expiry (daily at 10 AM)
SELECT cron.schedule(
  'check-certificate-expiry',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url:='https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/check-certificate-expiry',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpobXB3Y3pydml0b21zeGp3cHpjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NTE3NTI1NywiZXhwIjoyMDYwNzUxMjU3fQ.VBs6eT0AwLBHNrXSDTpPrmHXCh55j9aTRt0wWMD6cL4"}'::jsonb
  ) as request_id;
  $$
);

-- 4. Aggregate Email Analytics (hourly)
SELECT cron.schedule(
  'aggregate-email-analytics',
  '0 * * * *',
  $$
  INSERT INTO email_analytics_summary (
    period_start,
    emails_sent,
    emails_delivered,
    emails_failed,
    unique_opens,
    unique_clicks,
    bounce_rate
  )
  SELECT
    date_trunc('hour', NOW() - INTERVAL '1 hour') as period_start,
    COUNT(*) as emails_sent,
    COUNT(*) FILTER (WHERE delivery_status = 'delivered') as emails_delivered,
    COUNT(*) FILTER (WHERE delivery_status = 'failed') as emails_failed,
    COUNT(DISTINCT CASE WHEN opened_at IS NOT NULL THEN recipient_email END) as unique_opens,
    COUNT(DISTINCT CASE WHEN clicked_at IS NOT NULL THEN recipient_email END) as unique_clicks,
    ROUND(
      (COUNT(*) FILTER (WHERE delivery_status = 'bounced')::NUMERIC / 
       NULLIF(COUNT(*), 0) * 100), 2
    ) as bounce_rate
  FROM email_logs
  WHERE created_at >= NOW() - INTERVAL '1 hour'
    AND created_at < NOW();
  $$
);

-- 5. Check Manager Registration Expiry (daily at 8 AM)
SELECT cron.schedule(
  'check-manager-registration-expiry',
  '0 8 * * *',
  $$
  INSERT INTO notification_queue (recipient_email, subject, message, scheduled_for, priority, metadata)
  SELECT
    da.contact_email,
    CASE
      WHEN da.registration_token_expires_at <= NOW() + INTERVAL '3 days' THEN '🚨 URGENT: Registration Expires in 3 Days'
      WHEN da.registration_token_expires_at <= NOW() + INTERVAL '5 days' THEN '⏰ Registration Link Expires in 5 Days'
      ELSE '📧 Manager Registration Reminder'
    END as subject,
    'Dear ' || da.contact_person || ', your manager registration link expires soon.' as message,
    NOW() as scheduled_for,
    CASE
      WHEN da.registration_token_expires_at <= NOW() + INTERVAL '3 days' THEN 'high'::text
      ELSE 'normal'::text
    END as priority,
    jsonb_build_object(
      'template', CASE
        WHEN da.registration_token_expires_at <= NOW() + INTERVAL '3 days' THEN 'manager-registration-reminder-3day'
        ELSE 'manager-registration-reminder-5day'
      END,
      'application_id', da.id,
      'days_remaining', EXTRACT(DAY FROM (da.registration_token_expires_at - NOW()))
    ) as metadata
  FROM dispensary_applications da
  WHERE da.application_status = 'approved'
    AND da.registration_completed = FALSE
    AND da.registration_token_expires_at IS NOT NULL
    AND da.registration_token_expires_at > NOW()
    AND da.registration_token_expires_at <= NOW() + INTERVAL '5 days'
    AND NOT EXISTS (
      SELECT 1 FROM notification_queue nq
      WHERE nq.metadata->>'application_id' = da.id::text
        AND nq.created_at > NOW() - INTERVAL '24 hours'
    );
  $$
);

-- 6. Check Employee Course Stalls (daily at 11 AM)
SELECT cron.schedule(
  'check-employee-course-stalls',
  '0 11 * * *',
  $$
  INSERT INTO notification_queue (recipient_email, subject, message, scheduled_for, priority, metadata)
  SELECT
    au.email,
    '⏰ Continue Your Training - ' || COALESCE(o.name, 'ProCann Edu'),
    'Hi ' || p.first_name || ', it has been ' || 
    EXTRACT(DAY FROM (NOW() - up.updated_at))::INTEGER || 
    ' days since you last accessed your training.' as message,
    NOW() as scheduled_for,
    'normal'::text as priority,
    jsonb_build_object(
      'template', 'employee-course-stalled',
      'user_id', p.user_id,
      'days_stalled', EXTRACT(DAY FROM (NOW() - up.updated_at))::INTEGER
    ) as metadata
  FROM user_progress up
  JOIN profiles p ON p.user_id = up.user_id
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN organizations o ON o.id = p.organization_id
  WHERE up.updated_at < NOW() - INTERVAL '10 days'
    AND up.completed_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM notification_queue nq
      WHERE nq.metadata->>'user_id' = p.user_id::text
        AND nq.metadata->>'template' = 'employee-course-stalled'
        AND nq.created_at > NOW() - INTERVAL '7 days'
    );
  $$
);

-- 7. Calculate SLO Metrics (hourly)
SELECT cron.schedule(
  'calculate-slo-metrics',
  '15 * * * *',
  $$
  SELECT public.calculate_slo_metrics();
  $$
);

-- 8. Cleanup Old Logs (daily at 2 AM)
SELECT cron.schedule(
  'cleanup-old-logs',
  '0 2 * * *',
  $$
  DELETE FROM api_requests WHERE created_at < NOW() - INTERVAL '30 days';
  DELETE FROM email_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM communication_logs WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM notification_queue WHERE status = 'sent' AND created_at < NOW() - INTERVAL '30 days';
  $$
);

-- Create summary table for cron job status
CREATE TABLE IF NOT EXISTS cron_job_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  execution_time_ms INTEGER
);

COMMENT ON TABLE cron_job_executions IS 'Tracks execution history of all cron jobs for monitoring';
