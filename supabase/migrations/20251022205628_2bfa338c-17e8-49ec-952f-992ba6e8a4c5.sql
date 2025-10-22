-- Create system_integrity_checks table
CREATE TABLE IF NOT EXISTS public.system_integrity_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL CHECK (status IN ('detected', 'investigating', 'fixed', 'ignored')),
  affected_entity_type TEXT NOT NULL,
  affected_entity_id UUID,
  issue_description TEXT NOT NULL,
  technical_details JSONB DEFAULT '{}'::jsonb,
  suggested_fix TEXT,
  auto_fixable BOOLEAN DEFAULT false,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create system_integrity_fixes table
CREATE TABLE IF NOT EXISTS public.system_integrity_fixes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES public.system_integrity_checks(id),
  fix_type TEXT NOT NULL,
  fix_action TEXT NOT NULL,
  executed_by UUID,
  execution_mode TEXT NOT NULL CHECK (execution_mode IN ('manual', 'automatic')),
  success BOOLEAN NOT NULL,
  error_details JSONB,
  execution_duration_ms INTEGER,
  changes_made JSONB DEFAULT '{}'::jsonb,
  rollback_available BOOLEAN DEFAULT false,
  rollback_data JSONB,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_integrity_checks_status ON public.system_integrity_checks(status);
CREATE INDEX idx_integrity_checks_severity ON public.system_integrity_checks(severity);
CREATE INDEX idx_integrity_checks_detected_at ON public.system_integrity_checks(detected_at DESC);
CREATE INDEX idx_integrity_checks_entity ON public.system_integrity_checks(affected_entity_type, affected_entity_id);
CREATE INDEX idx_integrity_fixes_check_id ON public.system_integrity_fixes(check_id);
CREATE INDEX idx_integrity_fixes_executed_at ON public.system_integrity_fixes(executed_at DESC);

-- Enable RLS
ALTER TABLE public.system_integrity_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_integrity_fixes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_integrity_checks
CREATE POLICY "Admins can view all integrity checks"
  ON public.system_integrity_checks
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage integrity checks"
  ON public.system_integrity_checks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policies for system_integrity_fixes
CREATE POLICY "Admins can view all integrity fixes"
  ON public.system_integrity_fixes
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can manage integrity fixes"
  ON public.system_integrity_fixes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_integrity_checks_updated_at
  BEFORE UPDATE ON public.system_integrity_checks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.system_integrity_checks IS 'Stores detected system integrity issues and gaps';
COMMENT ON TABLE public.system_integrity_fixes IS 'Logs all remediation attempts for integrity issues';