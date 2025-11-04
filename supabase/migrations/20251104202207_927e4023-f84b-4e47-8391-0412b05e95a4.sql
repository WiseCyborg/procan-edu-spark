-- Create recommendation impact tracking table
CREATE TABLE IF NOT EXISTS public.recommendation_impact_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES public.curriculum_recommendations(id) ON DELETE CASCADE,
  implementation_date TIMESTAMPTZ NOT NULL,
  baseline_period_start TIMESTAMPTZ NOT NULL,
  baseline_period_end TIMESTAMPTZ NOT NULL,
  measurement_period_start TIMESTAMPTZ NOT NULL,
  measurement_period_end TIMESTAMPTZ,
  
  -- Baseline metrics (before implementation)
  baseline_pass_rate NUMERIC(5,2),
  baseline_avg_score NUMERIC(5,2),
  baseline_avg_attempts NUMERIC(5,2),
  baseline_remediation_rate NUMERIC(5,2),
  baseline_sample_size INTEGER DEFAULT 0,
  
  -- Post-implementation metrics
  post_pass_rate NUMERIC(5,2),
  post_avg_score NUMERIC(5,2),
  post_avg_attempts NUMERIC(5,2),
  post_remediation_rate NUMERIC(5,2),
  post_sample_size INTEGER DEFAULT 0,
  
  -- Improvement calculations
  improvement_pass_rate NUMERIC(5,2),
  improvement_avg_score NUMERIC(5,2),
  reduction_retake_rate NUMERIC(5,2),
  
  -- Time and cost metrics
  hours_spent_implementing NUMERIC(5,2),
  estimated_hours_saved_annually NUMERIC(5,2),
  estimated_cost_per_retake NUMERIC(10,2) DEFAULT 50.00,
  retakes_prevented_annually INTEGER,
  annual_savings_usd NUMERIC(10,2),
  roi_percentage NUMERIC(8,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendation_impact_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view impact tracking"
  ON public.recommendation_impact_tracking FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage impact tracking"
  ON public.recommendation_impact_tracking FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage impact tracking"
  ON public.recommendation_impact_tracking FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- Create missing exam analytics views
CREATE OR REPLACE VIEW public.exam_analytics_overview AS
SELECT 
  COUNT(*)::INTEGER as total_attempts,
  COUNT(DISTINCT user_id)::INTEGER as unique_test_takers,
  COUNT(*) FILTER (WHERE is_passed = true)::INTEGER as passed_attempts,
  COUNT(*) FILTER (WHERE is_passed = false)::INTEGER as failed_attempts,
  ROUND(AVG(total_score), 2) as average_score,
  ROUND(AVG(total_score) FILTER (WHERE is_passed = true), 2) as average_passing_score,
  ROUND(AVG(total_score) FILTER (WHERE is_passed = false), 2) as average_failing_score,
  ROUND(COUNT(*) FILTER (WHERE is_passed = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as overall_pass_rate,
  MIN(created_at) as first_attempt_date,
  MAX(created_at) as most_recent_attempt_date
FROM public.exam_attempts;

CREATE OR REPLACE VIEW public.exam_topic_analytics AS
SELECT 
  ets.section_number,
  eb.section_title,
  eb.comar_section,
  eb.topic_area,
  COUNT(*)::INTEGER as total_attempts,
  ROUND(AVG(ets.score_percentage), 2) as average_score,
  COUNT(*) FILTER (WHERE ets.score_percentage >= 80)::INTEGER as passed_count,
  COUNT(*) FILTER (WHERE ets.score_percentage < 80)::INTEGER as failed_count,
  ROUND(COUNT(*) FILTER (WHERE ets.score_percentage >= 80)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as pass_rate,
  MIN(ets.score_percentage)::INTEGER as min_score,
  MAX(ets.score_percentage)::INTEGER as max_score,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ets.score_percentage) as median_score,
  ROUND(STDDEV(ets.score_percentage), 2) as score_std_dev,
  COUNT(*) FILTER (WHERE ets.needs_remediation = true)::INTEGER as remediation_required_count
FROM public.exam_topic_scores ets
JOIN public.exam_blueprint eb ON eb.section_number = ets.section_number
GROUP BY ets.section_number, eb.section_title, eb.comar_section, eb.topic_area;

CREATE OR REPLACE VIEW public.exam_difficulty_analysis AS
SELECT 
  ets.section_number,
  eb.section_title,
  eb.comar_section,
  CASE 
    WHEN AVG(ets.score_percentage) >= 85 THEN 'easy'
    WHEN AVG(ets.score_percentage) >= 70 THEN 'medium'
    WHEN AVG(ets.score_percentage) >= 60 THEN 'hard'
    ELSE 'very_hard'
  END::TEXT as difficulty_level,
  ROUND(AVG(ets.score_percentage), 2) as average_performance,
  COUNT(*)::INTEGER as sample_size,
  ROUND(COUNT(*) FILTER (WHERE ets.score_percentage < 80)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as failure_rate
FROM public.exam_topic_scores ets
JOIN public.exam_blueprint eb ON eb.section_number = ets.section_number
GROUP BY ets.section_number, eb.section_title, eb.comar_section;

CREATE OR REPLACE VIEW public.exam_struggling_sections AS
SELECT 
  ets.section_number,
  eb.section_title,
  eb.comar_section,
  eb.topic_area,
  COUNT(*)::INTEGER as total_attempts,
  COUNT(DISTINCT ea.user_id) FILTER (WHERE ets.score_percentage < 80)::INTEGER as students_struggling,
  ROUND(COUNT(DISTINCT ea.user_id) FILTER (WHERE ets.score_percentage < 80)::NUMERIC / 
        NULLIF(COUNT(DISTINCT ea.user_id), 0) * 100, 2) as struggle_rate,
  ROUND(AVG(ets.score_percentage), 2) as average_score,
  ROUND(AVG(ets.score_percentage) FILTER (WHERE ets.score_percentage < 80), 2) as avg_struggling_score
FROM public.exam_topic_scores ets
JOIN public.exam_blueprint eb ON eb.section_number = ets.section_number
JOIN public.exam_attempts ea ON ea.id = ets.exam_attempt_id
GROUP BY ets.section_number, eb.section_title, eb.comar_section, eb.topic_area
HAVING COUNT(DISTINCT ea.user_id) FILTER (WHERE ets.score_percentage < 80) > 0;

CREATE OR REPLACE VIEW public.exam_monthly_trends AS
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') as month,
  COUNT(*)::INTEGER as total_attempts,
  COUNT(*) FILTER (WHERE is_passed = true)::INTEGER as passed,
  COUNT(*) FILTER (WHERE is_passed = false)::INTEGER as failed,
  ROUND(AVG(total_score), 2) as avg_score,
  ROUND(COUNT(*) FILTER (WHERE is_passed = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as pass_rate
FROM public.exam_attempts
GROUP BY TO_CHAR(created_at, 'YYYY-MM')
ORDER BY month DESC;

-- Add columns to curriculum_recommendations
ALTER TABLE public.curriculum_recommendations 
ADD COLUMN IF NOT EXISTS implementation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tracked_impact BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS impact_summary JSONB DEFAULT '{}'::jsonb;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exam_attempts_created_at ON public.exam_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_passed ON public.exam_attempts(user_id, is_passed);
CREATE INDEX IF NOT EXISTS idx_impact_tracking_recommendation ON public.recommendation_impact_tracking(recommendation_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_impact_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_impact_tracking_timestamp
  BEFORE UPDATE ON public.recommendation_impact_tracking
  FOR EACH ROW
  EXECUTE FUNCTION public.update_impact_tracking_updated_at();