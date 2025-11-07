-- Create competitor snapshots table
CREATE TABLE public.competitor_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_name TEXT NOT NULL,
  website_url TEXT,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  pricing_model TEXT,
  price_per_student NUMERIC,
  features_detected TEXT[],
  market_position TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitive alerts table
CREATE TABLE public.competitive_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES public.competitor_snapshots(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  action_taken TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create competitor analysis history table
CREATE TABLE public.competitor_analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  competitors_analyzed INTEGER NOT NULL DEFAULT 0,
  recommendations_generated INTEGER NOT NULL DEFAULT 0,
  key_findings TEXT[],
  market_summary TEXT,
  ai_agent_run_id UUID REFERENCES public.ai_agent_runs(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.competitor_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitive_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_analysis_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for competitor_snapshots
CREATE POLICY "Admins can manage competitor snapshots"
  ON public.competitor_snapshots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage competitor snapshots"
  ON public.competitor_snapshots
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- RLS Policies for competitive_alerts
CREATE POLICY "Admins can manage competitive alerts"
  ON public.competitive_alerts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage competitive alerts"
  ON public.competitive_alerts
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- RLS Policies for competitor_analysis_history
CREATE POLICY "Admins can view competitor analysis"
  ON public.competitor_analysis_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage competitor analysis"
  ON public.competitor_analysis_history
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- Seed initial competitor data
INSERT INTO public.competitor_snapshots (competitor_name, website_url, pricing_model, price_per_student, features_detected, market_position, notes) VALUES
  ('GreenLeaf Training', 'https://greenleaftraining.com', 'per_student', 75.00, ARRAY['on-demand-modules', 'live-sessions', 'certificates'], 'mid-market', 'Local Maryland competitor, focuses on retail training'),
  ('Cannabis Academy Pro', 'https://cannabisacademypro.com', 'subscription', 99.00, ARRAY['on-demand-modules', 'compliance-tracking', 'group-licenses'], 'premium', 'National player with strong brand recognition'),
  ('Dispensary Training Hub', 'https://dispensarytraininghub.com', 'per_student', 49.99, ARRAY['basic-modules', 'quizzes'], 'budget', 'Low-cost competitor, limited compliance coverage'),
  ('MedCannabis Institute', 'https://medcannabis.edu', 'enterprise', 150.00, ARRAY['on-demand-modules', 'live-sessions', 'certification', 'comar-compliant', 'consulting'], 'premium', 'High-end competitor with consulting services'),
  ('Cannabis Compliance Academy', 'https://cannabiscompliance.training', 'per_student', 89.00, ARRAY['on-demand-modules', 'compliance-tracking', 'updates', 'comar-compliant'], 'mid-market', 'Strong focus on Maryland COMAR compliance');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_competitor_snapshots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_competitor_snapshots_timestamp
  BEFORE UPDATE ON public.competitor_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_competitor_snapshots_updated_at();