-- Add UAT fields to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS uat_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS uat_email TEXT,
ADD COLUMN IF NOT EXISTS current_uat_run_id UUID;

-- Create uat_runs table to group UAT cycles
CREATE TABLE IF NOT EXISTS public.uat_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  run_code TEXT NOT NULL UNIQUE,
  status TEXT CHECK (status IN ('active', 'paused', 'completed', 'abandoned')) DEFAULT 'active',
  started_by UUID REFERENCES auth.users(id),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  checklist_id UUID REFERENCES public.uat_validation_checklists(id),
  summary_metrics JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create uat_tasks table for agent-managed tasks
CREATE TABLE IF NOT EXISTS public.uat_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.uat_runs(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  task_code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  role_to_test TEXT,
  deep_link TEXT,
  expected_result TEXT,
  status TEXT CHECK (status IN ('todo', 'doing', 'blocked', 'done', 'skipped')) DEFAULT 'todo',
  evidence TEXT,
  evidence_file_path TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_uat_runs_organization_id ON public.uat_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_uat_runs_status ON public.uat_runs(status);
CREATE INDEX IF NOT EXISTS idx_uat_tasks_run_id ON public.uat_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_uat_tasks_status ON public.uat_tasks(status);
CREATE INDEX IF NOT EXISTS idx_uat_tasks_organization_id ON public.uat_tasks(organization_id);

-- Add foreign key for current_uat_run_id
ALTER TABLE public.organizations
ADD CONSTRAINT fk_organizations_current_uat_run
FOREIGN KEY (current_uat_run_id) REFERENCES public.uat_runs(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.uat_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uat_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for uat_runs
CREATE POLICY "Admins can manage all UAT runs"
  ON public.uat_runs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can view their UAT runs"
  ON public.uat_runs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator')
      AND p.organization_id = uat_runs.organization_id
    )
  );

CREATE POLICY "Org managers can create UAT runs"
  ON public.uat_runs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator', 'admin')
      AND (p.organization_id = uat_runs.organization_id OR ur.role = 'admin')
    )
  );

CREATE POLICY "Org managers can update their UAT runs"
  ON public.uat_runs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator', 'admin')
      AND (p.organization_id = uat_runs.organization_id OR ur.role = 'admin')
    )
  );

-- RLS Policies for uat_tasks
CREATE POLICY "Admins can manage all UAT tasks"
  ON public.uat_tasks FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can view their UAT tasks"
  ON public.uat_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator')
      AND p.organization_id = uat_tasks.organization_id
    )
  );

CREATE POLICY "Org managers can update their UAT tasks"
  ON public.uat_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager', 'training_coordinator', 'admin')
      AND (p.organization_id = uat_tasks.organization_id OR ur.role = 'admin')
    )
  );

CREATE POLICY "Service role can manage UAT tasks"
  ON public.uat_tasks FOR ALL
  USING (current_setting('role', true) = 'service_role');

CREATE POLICY "Service role can manage UAT runs"
  ON public.uat_runs FOR ALL
  USING (current_setting('role', true) = 'service_role');

-- Add trigger for updated_at
CREATE TRIGGER update_uat_runs_updated_at
  BEFORE UPDATE ON public.uat_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_uat_tasks_updated_at
  BEFORE UPDATE ON public.uat_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();