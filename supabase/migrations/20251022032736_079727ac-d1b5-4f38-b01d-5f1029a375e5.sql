-- Federal regulation tracking
CREATE TABLE IF NOT EXISTS public.federal_regulation_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compliance alerts for critical changes
CREATE TABLE IF NOT EXISTS public.compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_users_count INT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI agent execution logs
CREATE TABLE IF NOT EXISTS public.ai_agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  execution_status TEXT NOT NULL,
  execution_duration_ms INT,
  items_processed INT DEFAULT 0,
  changes_detected INT DEFAULT 0,
  actions_taken JSONB DEFAULT '[]',
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Owner digest preferences
CREATE TABLE IF NOT EXISTS public.owner_digest_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  delivery_time TIME NOT NULL DEFAULT '08:00:00',
  delivery_days TEXT[] DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  include_sections TEXT[] DEFAULT ARRAY['health', 'revenue', 'compliance', 'engagement'],
  email_address TEXT NOT NULL,
  sms_number TEXT,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Platform health scores
CREATE TABLE IF NOT EXISTS public.platform_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  score_date DATE NOT NULL UNIQUE,
  overall_score NUMERIC(5,2) NOT NULL,
  email_health_score NUMERIC(5,2),
  compliance_score NUMERIC(5,2),
  engagement_score NUMERIC(5,2),
  revenue_health_score NUMERIC(5,2),
  security_score NUMERIC(5,2),
  calculation_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI-generated insights
CREATE TABLE IF NOT EXISTS public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score NUMERIC(3,2),
  actionable BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  action_taken_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.federal_regulation_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_digest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only for most)
CREATE POLICY "Admins can view federal tracking" ON public.federal_regulation_tracking
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage federal tracking" ON public.federal_regulation_tracking
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can manage compliance alerts" ON public.compliance_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage compliance alerts" ON public.compliance_alerts
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Service role can manage agent runs" ON public.ai_agent_runs
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view agent runs" ON public.ai_agent_runs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own digest preferences" ON public.owner_digest_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all digest preferences" ON public.owner_digest_preferences
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage digest preferences" ON public.owner_digest_preferences
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view health scores" ON public.platform_health_scores
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage health scores" ON public.platform_health_scores
  FOR ALL USING (current_setting('role') = 'service_role');

CREATE POLICY "Admins can view insights" ON public.ai_insights
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage insights" ON public.ai_insights
  FOR ALL USING (current_setting('role') = 'service_role');