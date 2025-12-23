-- UAT Validation Checklists table for compliance system testing
CREATE TABLE public.uat_validation_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  tester_user_id UUID NOT NULL,
  tester_name TEXT NOT NULL,
  company_name TEXT NOT NULL,
  test_organization_name TEXT,
  primary_test_email TEXT NOT NULL,
  testing_dates JSONB DEFAULT '[]'::jsonb,
  testers JSONB DEFAULT '[]'::jsonb,
  
  -- Section 1: Authentication & Email Delivery
  auth_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 2: Certificate Status Automation
  certificates_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 3: Supervisor Signoffs
  signoffs_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 4: Retraining Invalidates Signoffs
  retraining_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 5: Module Version Update
  module_version_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 6: Incident → Retraining Workflow
  incident_workflow_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 7: Employee Compliance Packet
  packet_export_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 8: Packet Content Verification
  packet_content_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 9: Dashboard Metrics
  dashboard_metrics_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 10: Certificate Expiry Notifications
  notifications_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 11: Bulk Operations
  bulk_operations_section JSONB DEFAULT '{}'::jsonb,
  
  -- Section 12: Mock MCA Audit Walkthrough
  audit_readiness_section JSONB DEFAULT '{}'::jsonb,
  
  -- Overall feedback
  what_worked_well TEXT,
  what_was_confusing TEXT,
  blocker_concerns TEXT,
  overall_status TEXT CHECK (overall_status IN ('pass', 'conditional', 'fail')),
  confident_for_auditor BOOLEAN,
  confident_explanation TEXT,
  
  -- Sign-off
  signature_name TEXT,
  roles_tested TEXT[] DEFAULT '{}',
  signed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.uat_validation_checklists ENABLE ROW LEVEL SECURITY;

-- Index for faster lookups
CREATE INDEX idx_uat_validation_checklists_user ON public.uat_validation_checklists(tester_user_id);
CREATE INDEX idx_uat_validation_checklists_org ON public.uat_validation_checklists(organization_id);

-- RLS Policies

-- UAT users can create their own checklists
CREATE POLICY "UAT users can create their own checklists"
ON public.uat_validation_checklists
FOR INSERT
WITH CHECK (auth.uid() = tester_user_id);

-- UAT users can view their own checklists
CREATE POLICY "UAT users can view their own checklists"
ON public.uat_validation_checklists
FOR SELECT
USING (auth.uid() = tester_user_id);

-- UAT users can update their own checklists (only if not submitted)
CREATE POLICY "UAT users can update their own checklists"
ON public.uat_validation_checklists
FOR UPDATE
USING (auth.uid() = tester_user_id AND submitted_at IS NULL);

-- Admins can view all checklists
CREATE POLICY "Admins can view all checklists"
ON public.uat_validation_checklists
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'admin'::app_role
));

-- Admins can manage all checklists
CREATE POLICY "Admins can manage all checklists"
ON public.uat_validation_checklists
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'admin'::app_role
));

-- Update trigger for updated_at
CREATE TRIGGER update_uat_validation_checklists_updated_at
  BEFORE UPDATE ON public.uat_validation_checklists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();