-- UAT Evidence table for Louis/Danielle submission form
CREATE TABLE IF NOT EXISTS public.uat_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.uat_runs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.uat_tasks(id) ON DELETE CASCADE,
  tester_email TEXT NOT NULL,
  role_used TEXT,
  action_performed TEXT NOT NULL,
  expected_result TEXT,
  actual_result TEXT,
  screenshot_path TEXT,
  download_link TEXT,
  record_ids JSONB DEFAULT '[]'::jsonb,
  passed BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_uat_evidence_run_id ON public.uat_evidence(run_id);
CREATE INDEX IF NOT EXISTS idx_uat_evidence_task_id ON public.uat_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_uat_evidence_tester_email ON public.uat_evidence(tester_email);
CREATE INDEX IF NOT EXISTS idx_uat_evidence_passed ON public.uat_evidence(passed);

-- Enable RLS
ALTER TABLE public.uat_evidence ENABLE ROW LEVEL SECURITY;

-- RLS policies for uat_evidence
CREATE POLICY "Admins can manage all UAT evidence"
  ON public.uat_evidence
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'dispensary_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('admin', 'dispensary_manager')
    )
  );

CREATE POLICY "Testers can view and create evidence"
  ON public.uat_evidence
  FOR SELECT
  TO authenticated
  USING (tester_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Testers can insert their own evidence"
  ON public.uat_evidence
  FOR INSERT
  TO authenticated
  WITH CHECK (tester_email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Add updated_at trigger
CREATE TRIGGER update_uat_evidence_updated_at
  BEFORE UPDATE ON public.uat_evidence
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();