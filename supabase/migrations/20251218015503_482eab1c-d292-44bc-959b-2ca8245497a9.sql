-- Pipeline Health Events - logs all agent actions
CREATE TABLE IF NOT EXISTS public.pipeline_health_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline TEXT NOT NULL, -- 'application', 'organization', 'seat', 'user', 'training', 'certification'
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  issue_type TEXT NOT NULL, -- 'missing_org', 'missing_seats', 'missing_join_code', 'unregistered_manager', 'stalled_training', etc.
  description TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID,
  auto_fixed BOOLEAN DEFAULT false,
  fix_action TEXT, -- what action was taken
  requires_admin BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pipeline Health Snapshot - single row refreshed each run
CREATE TABLE IF NOT EXISTS public.pipeline_health_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_orgs INTEGER DEFAULT 0,
  healthy_orgs INTEGER DEFAULT 0,
  orgs_with_issues INTEGER DEFAULT 0,
  total_seats INTEGER DEFAULT 0,
  allocated_seats INTEGER DEFAULT 0,
  seat_mismatches INTEGER DEFAULT 0,
  unregistered_managers INTEGER DEFAULT 0,
  stalled_users INTEGER DEFAULT 0,
  total_in_training INTEGER DEFAULT 0,
  total_certified INTEGER DEFAULT 0,
  pipelines_healthy INTEGER DEFAULT 0,
  pipelines_total INTEGER DEFAULT 7,
  issues_detected INTEGER DEFAULT 0,
  auto_fixed_today INTEGER DEFAULT 0,
  needs_admin_attention INTEGER DEFAULT 0,
  last_run_at TIMESTAMPTZ DEFAULT now(),
  last_run_duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE pipeline_health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_health_snapshot ENABLE ROW LEVEL SECURITY;

-- Admin can read/write events
CREATE POLICY "Admins can manage pipeline health events"
ON pipeline_health_events FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin can read/write snapshot
CREATE POLICY "Admins can manage pipeline health snapshot"
ON pipeline_health_snapshot FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_pipeline_health_events_created ON pipeline_health_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_health_events_severity ON pipeline_health_events(severity);
CREATE INDEX IF NOT EXISTS idx_pipeline_health_events_pipeline ON pipeline_health_events(pipeline);

-- Insert initial snapshot row
INSERT INTO pipeline_health_snapshot (id) VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;