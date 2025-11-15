-- Step 5: Enable RLS on Critical Security Tables

-- Enable RLS on escalation_log
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage escalation logs"
ON escalation_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view escalation logs"
ON escalation_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Enable RLS on password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage password reset tokens"
ON password_reset_tokens FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can view their own reset tokens"
ON password_reset_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Enable RLS on cron_job_executions
ALTER TABLE cron_job_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage cron job executions"
ON cron_job_executions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can view cron job executions"
ON cron_job_executions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

COMMENT ON POLICY "Service role can manage escalation logs" ON escalation_log IS 'Allow service role full access to escalation logs';
COMMENT ON POLICY "Service role can manage password reset tokens" ON password_reset_tokens IS 'Allow service role full access to password reset tokens';
COMMENT ON POLICY "Service role can manage cron job executions" ON cron_job_executions IS 'Allow service role full access to cron job executions';