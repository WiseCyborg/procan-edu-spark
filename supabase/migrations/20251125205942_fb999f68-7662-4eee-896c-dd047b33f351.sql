-- Create table for AI-generated fix plans
CREATE TABLE IF NOT EXISTS public.ai_fix_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES public.system_integrity_checks(id) ON DELETE CASCADE,
  analysis_model TEXT NOT NULL,
  root_cause TEXT,
  fix_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  affected_systems JSONB DEFAULT '{}'::jsonb,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  estimated_duration_seconds INTEGER,
  rollback_strategy TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns to system_integrity_fixes for enhanced tracking
ALTER TABLE public.system_integrity_fixes 
  ADD COLUMN IF NOT EXISTS ai_plan_id UUID REFERENCES public.ai_fix_plans(id),
  ADD COLUMN IF NOT EXISTS execution_steps JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_result JSONB,
  ADD COLUMN IF NOT EXISTS user_approved_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE public.ai_fix_plans ENABLE ROW LEVEL SECURITY;

-- Admin-only access to AI fix plans
CREATE POLICY "Admins can manage AI fix plans"
  ON public.ai_fix_plans
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_fix_plans_check_id ON public.ai_fix_plans(check_id);
CREATE INDEX IF NOT EXISTS idx_ai_fix_plans_generated_at ON public.ai_fix_plans(generated_at DESC);