-- ============================================
-- AGENT ORCHESTRATION SYSTEM TABLES
-- ============================================

-- Agent Events Table (Event Bus for inter-agent communication)
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('dispatch', 'report', 'fix_attempt', 'fix_complete', 'escalate', 'health_update')),
  source_agent TEXT NOT NULL,
  target_agent TEXT,
  correlation_id UUID, -- chains related events
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Agent Configuration Table
CREATE TABLE IF NOT EXISTS public.agent_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT true,
  schedule_cron TEXT, -- e.g., '*/5 * * * *' for every 5 minutes
  thresholds JSONB DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_run_duration_ms INTEGER,
  last_run_status TEXT,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Escalation Log Table
CREATE TABLE IF NOT EXISTS public.agent_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT NOT NULL,
  escalation_level INTEGER DEFAULT 1,
  issue_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  organization_id UUID REFERENCES public.organizations(id),
  user_id UUID,
  attempts INTEGER DEFAULT 1,
  first_detected_at TIMESTAMPTZ DEFAULT now(),
  last_escalated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_escalations ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for agent tables
CREATE POLICY "Admin can manage agent_events"
  ON public.agent_events
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage agent_configs"
  ON public.agent_configs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can manage agent_escalations"
  ON public.agent_escalations
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_events_status ON public.agent_events(status);
CREATE INDEX IF NOT EXISTS idx_agent_events_source ON public.agent_events(source_agent);
CREATE INDEX IF NOT EXISTS idx_agent_events_target ON public.agent_events(target_agent);
CREATE INDEX IF NOT EXISTS idx_agent_events_correlation ON public.agent_events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_created ON public.agent_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_escalations_unresolved ON public.agent_escalations(agent_type) WHERE resolved_at IS NULL;

-- Enable realtime for agent_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_events;

-- Insert default agent configurations
INSERT INTO public.agent_configs (agent_type, schedule_cron, thresholds) VALUES
  ('pipeline_health', '*/5 * * * *', '{"max_issues": 100, "alert_threshold": 10}'::jsonb),
  ('organization_integrity', '*/10 * * * *', '{"token_expiry_days": 7, "reminder_days": 3}'::jsonb),
  ('seat_reconciliation', '*/15 * * * *', '{"max_deficit": 50, "auto_create": true}'::jsonb),
  ('application_state', '*/5 * * * *', '{"stuck_days": 7, "auto_advance": false}'::jsonb),
  ('certificate_integrity', '0 * * * *', '{"expiry_warning_days": 30, "auto_generate": true}'::jsonb),
  ('communications', '*/10 * * * *', '{"retry_limit": 3, "circuit_threshold": 5}'::jsonb)
ON CONFLICT (agent_type) DO NOTHING;