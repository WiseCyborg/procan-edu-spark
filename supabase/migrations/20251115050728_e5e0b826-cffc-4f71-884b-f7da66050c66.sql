-- Step 4: Create email_analytics_summary table for aggregated metrics

CREATE TABLE IF NOT EXISTS email_analytics_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  emails_sent integer DEFAULT 0,
  emails_delivered integer DEFAULT 0,
  emails_failed integer DEFAULT 0,
  unique_opens integer DEFAULT 0,
  unique_clicks integer DEFAULT 0,
  total_opens integer DEFAULT 0,
  total_clicks integer DEFAULT 0,
  bounce_rate numeric(5,2) DEFAULT 0,
  open_rate numeric(5,2) DEFAULT 0,
  click_rate numeric(5,2) DEFAULT 0,
  failure_rate numeric(5,2) DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE email_analytics_summary ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view email analytics summary"
ON email_analytics_summary FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Service role can manage email analytics summary"
ON email_analytics_summary FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_email_analytics_summary_period ON email_analytics_summary(period_start, period_end);

COMMENT ON TABLE email_analytics_summary IS 'Aggregated email analytics metrics for dashboard reporting';