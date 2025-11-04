-- Create curriculum recommendations table
CREATE TABLE IF NOT EXISTS public.curriculum_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  category TEXT NOT NULL CHECK (category IN ('compliance', 'competitive', 'usability', 'exam_performance')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  rationale TEXT,
  estimated_effort TEXT,
  impact TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  related_module_ids UUID[],
  related_sections INTEGER[],
  data_source JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_agent TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_curriculum_recommendations_status ON public.curriculum_recommendations(status);
CREATE INDEX idx_curriculum_recommendations_priority ON public.curriculum_recommendations(priority);
CREATE INDEX idx_curriculum_recommendations_created ON public.curriculum_recommendations(created_at DESC);

-- Enable RLS
ALTER TABLE public.curriculum_recommendations ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage curriculum recommendations"
  ON public.curriculum_recommendations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage recommendations"
  ON public.curriculum_recommendations
  FOR ALL
  USING (current_setting('role') = 'service_role');