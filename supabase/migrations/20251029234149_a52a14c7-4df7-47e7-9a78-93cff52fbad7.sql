-- Create tables for comprehensive health monitoring

-- Table for storing lighthouse performance scores
CREATE TABLE IF NOT EXISTS public.lighthouse_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  accessibility_score INTEGER CHECK (accessibility_score >= 0 AND accessibility_score <= 100),
  best_practices_score INTEGER CHECK (best_practices_score >= 0 AND best_practices_score <= 100),
  seo_score INTEGER CHECK (seo_score >= 0 AND seo_score <= 100),
  page_url TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for automated test results
CREATE TABLE IF NOT EXISTS public.automated_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('passed', 'failed', 'skipped')),
  duration_ms INTEGER,
  error_message TEXT,
  test_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Table for system health snapshots
CREATE TABLE IF NOT EXISTS public.system_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_health_score INTEGER CHECK (overall_health_score >= 0 AND overall_health_score <= 100),
  component_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  gaps JSONB DEFAULT '[]'::jsonb,
  test_results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for edge function deployment status
CREATE TABLE IF NOT EXISTS public.edge_function_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  is_deployed BOOLEAN NOT NULL DEFAULT false,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  error_message TEXT,
  status_code INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for integration health checks
CREATE TABLE IF NOT EXISTS public.integration_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  error_count INTEGER DEFAULT 0,
  success_rate NUMERIC(5,2),
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.lighthouse_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automated_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;

-- RLS Policies (admin only)
CREATE POLICY "Admin can view lighthouse scores"
  ON public.lighthouse_scores FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert lighthouse scores"
  ON public.lighthouse_scores FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can view test results"
  ON public.automated_test_results FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert test results"
  ON public.automated_test_results FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can view health snapshots"
  ON public.system_health_snapshots FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can insert health snapshots"
  ON public.system_health_snapshots FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can view function status"
  ON public.edge_function_status FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage function status"
  ON public.edge_function_status FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can view integration health"
  ON public.integration_health FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin can manage integration health"
  ON public.integration_health FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_lighthouse_scores_date ON public.lighthouse_scores(test_date DESC);
CREATE INDEX idx_test_results_date ON public.automated_test_results(test_date DESC);
CREATE INDEX idx_health_snapshots_date ON public.system_health_snapshots(snapshot_date DESC);
CREATE INDEX idx_function_status_name ON public.edge_function_status(function_name);
CREATE INDEX idx_integration_health_name ON public.integration_health(integration_name, last_check DESC);