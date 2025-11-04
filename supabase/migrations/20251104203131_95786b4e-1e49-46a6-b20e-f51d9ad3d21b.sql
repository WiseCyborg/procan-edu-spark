-- Phase 1: Enhanced Database Schema for COMAR Integration & Predictive Analytics

-- COMAR version tracking
CREATE TABLE public.comar_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_reference TEXT NOT NULL,
  version_number TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  content TEXT,
  change_summary TEXT,
  supersedes UUID REFERENCES public.comar_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for comar_versions
ALTER TABLE public.comar_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage COMAR versions"
  ON public.comar_versions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view COMAR versions"
  ON public.comar_versions
  FOR SELECT
  USING (true);

-- Link modules to specific COMAR versions
ALTER TABLE public.course_modules 
  ADD COLUMN comar_version_id UUID REFERENCES public.comar_versions(id),
  ADD COLUMN last_comar_review_date TIMESTAMPTZ,
  ADD COLUMN comar_compliance_status TEXT CHECK (comar_compliance_status IN ('current', 'needs_review', 'outdated'));

-- Exam attempt enrichment for predictive modeling
ALTER TABLE public.exam_attempts
  ADD COLUMN user_demographics JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN session_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN previous_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN days_since_last_attempt INTEGER;

-- Predictive model tracking
CREATE TABLE public.prediction_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  model_type TEXT NOT NULL CHECK (model_type IN ('roi_forecast', 'pass_rate_prediction', 'dropout_risk', 'content_effectiveness')),
  version TEXT NOT NULL,
  training_data_start TIMESTAMPTZ,
  training_data_end TIMESTAMPTZ,
  features JSONB DEFAULT '{}'::jsonb,
  performance_metrics JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for prediction_models
ALTER TABLE public.prediction_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage prediction models"
  ON public.prediction_models
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage prediction models"
  ON public.prediction_models
  FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text);

-- Prediction results (for auditing and improvement)
CREATE TABLE public.prediction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID REFERENCES public.prediction_models(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('recommendation', 'student', 'topic', 'organization')),
  entity_id UUID NOT NULL,
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  predicted_value NUMERIC,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  actual_value NUMERIC,
  feature_values JSONB DEFAULT '{}'::jsonb,
  variance_percentage NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for prediction_results
ALTER TABLE public.prediction_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view prediction results"
  ON public.prediction_results
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage prediction results"
  ON public.prediction_results
  FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text);

-- Recommendation feedback loop
CREATE TABLE public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.curriculum_recommendations(id) ON DELETE CASCADE,
  actual_implementation_date TIMESTAMPTZ,
  actual_roi NUMERIC,
  predicted_roi NUMERIC,
  variance_percentage NUMERIC,
  lessons_learned TEXT,
  would_recommend_again BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for recommendation_feedback
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage recommendation feedback"
  ON public.recommendation_feedback
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Maryland-specific analytics: County-level performance
CREATE TABLE public.maryland_county_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  county_name TEXT NOT NULL,
  month DATE NOT NULL,
  total_students INTEGER DEFAULT 0,
  pass_rate NUMERIC(5,2),
  average_score NUMERIC(5,2),
  active_dispensaries INTEGER DEFAULT 0,
  compliance_score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(county_name, month)
);

-- RLS policies for maryland_county_analytics
ALTER TABLE public.maryland_county_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage county analytics"
  ON public.maryland_county_analytics
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage county analytics"
  ON public.maryland_county_analytics
  FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text);

-- ROI forecast results table
CREATE TABLE public.roi_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.curriculum_recommendations(id) ON DELETE CASCADE,
  forecast_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  predicted_roi_percentage NUMERIC,
  confidence_interval_lower NUMERIC,
  confidence_interval_upper NUMERIC,
  expected_pass_rate_improvement NUMERIC,
  payback_period_months INTEGER,
  risk_factors JSONB DEFAULT '[]'::jsonb,
  comparable_implementations JSONB DEFAULT '[]'::jsonb,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS policies for roi_forecasts
ALTER TABLE public.roi_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view ROI forecasts"
  ON public.roi_forecasts
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage ROI forecasts"
  ON public.roi_forecasts
  FOR ALL
  USING (current_setting('role'::text) = 'service_role'::text);

-- Indexes for performance
CREATE INDEX idx_comar_versions_section ON public.comar_versions(section_reference);
CREATE INDEX idx_comar_versions_effective_date ON public.comar_versions(effective_date);
CREATE INDEX idx_course_modules_comar_status ON public.course_modules(comar_compliance_status);
CREATE INDEX idx_prediction_results_entity ON public.prediction_results(entity_type, entity_id);
CREATE INDEX idx_prediction_results_date ON public.prediction_results(prediction_date);
CREATE INDEX idx_roi_forecasts_recommendation ON public.roi_forecasts(recommendation_id);
CREATE INDEX idx_maryland_county_month ON public.maryland_county_analytics(county_name, month);

-- Trigger for updated_at
CREATE TRIGGER update_comar_versions_updated_at
  BEFORE UPDATE ON public.comar_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prediction_models_updated_at
  BEFORE UPDATE ON public.prediction_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recommendation_feedback_updated_at
  BEFORE UPDATE ON public.recommendation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();