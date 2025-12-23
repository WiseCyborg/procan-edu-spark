-- =====================================================
-- PHASE 2 & 3: Audit Readiness & Governance Infrastructure
-- =====================================================

-- =====================================================
-- PHASE 2.1: First-Shift Verification System
-- =====================================================

-- Add first-shift tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS first_shift_date DATE,
ADD COLUMN IF NOT EXISTS training_verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS training_verified_at TIMESTAMPTZ;

-- Create first-shift compliance alerts table
CREATE TABLE IF NOT EXISTS public.first_shift_compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('approaching_deadline', 'working_uncertified', 'deadline_passed', 'training_incomplete')),
  first_shift_date DATE NOT NULL,
  training_status TEXT NOT NULL,
  days_until_shift INTEGER,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.first_shift_compliance_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for first_shift_compliance_alerts
CREATE POLICY "Admins can manage all first-shift alerts"
  ON public.first_shift_compliance_alerts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view their org alerts"
  ON public.first_shift_compliance_alerts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = first_shift_compliance_alerts.organization_id
  ));

CREATE POLICY "Managers can update their org alerts"
  ON public.first_shift_compliance_alerts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = first_shift_compliance_alerts.organization_id
  ));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_first_shift_alerts_org ON public.first_shift_compliance_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_first_shift_alerts_employee ON public.first_shift_compliance_alerts(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_first_shift_alerts_type ON public.first_shift_compliance_alerts(alert_type);

-- =====================================================
-- PHASE 2.2: Content Version Control
-- =====================================================

-- Create curriculum versions table
CREATE TABLE IF NOT EXISTS public.curriculum_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  changelog TEXT,
  comar_version_id UUID REFERENCES public.comar_versions(id),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, version_number)
);

-- Add version tracking to user_progress
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS curriculum_version_id UUID REFERENCES public.curriculum_versions(id);

-- Create version mismatch tracking
CREATE TABLE IF NOT EXISTS public.training_version_mismatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  trained_version_id UUID REFERENCES public.curriculum_versions(id),
  current_version_id UUID REFERENCES public.curriculum_versions(id),
  retraining_required BOOLEAN DEFAULT false,
  retraining_assigned_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.curriculum_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_version_mismatches ENABLE ROW LEVEL SECURITY;

-- RLS policies for curriculum_versions
CREATE POLICY "Anyone can view curriculum versions"
  ON public.curriculum_versions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage curriculum versions"
  ON public.curriculum_versions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for training_version_mismatches
CREATE POLICY "Users can view their own mismatches"
  ON public.training_version_mismatches FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all mismatches"
  ON public.training_version_mismatches FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view their org mismatches"
  ON public.training_version_mismatches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    JOIN profiles emp ON emp.user_id = training_version_mismatches.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = emp.organization_id
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_curriculum_versions_course ON public.curriculum_versions(course_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_versions_active ON public.curriculum_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_version_mismatches_user ON public.training_version_mismatches(user_id);
CREATE INDEX IF NOT EXISTS idx_version_mismatches_course ON public.training_version_mismatches(course_id);

-- Trigger for updated_at
CREATE TRIGGER update_curriculum_versions_updated_at
  BEFORE UPDATE ON public.curriculum_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PHASE 3.1: Quarterly Review Cadence
-- =====================================================

-- Create scheduled reviews table
CREATE TABLE IF NOT EXISTS public.scheduled_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('quarterly', 'annual', 'incident_triggered', 'regulatory_update', 'ad_hoc')),
  review_name TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  findings TEXT,
  action_items JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'overdue', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scheduled_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for scheduled_reviews
CREATE POLICY "Admins can manage all reviews"
  ON public.scheduled_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view and complete their org reviews"
  ON public.scheduled_reviews FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = scheduled_reviews.organization_id
  ));

CREATE POLICY "Managers can update their org reviews"
  ON public.scheduled_reviews FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = scheduled_reviews.organization_id
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scheduled_reviews_org ON public.scheduled_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reviews_status ON public.scheduled_reviews(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reviews_due_date ON public.scheduled_reviews(due_date);

-- Trigger for updated_at
CREATE TRIGGER update_scheduled_reviews_updated_at
  BEFORE UPDATE ON public.scheduled_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-schedule quarterly reviews for new organizations
CREATE OR REPLACE FUNCTION public.auto_schedule_quarterly_reviews()
RETURNS TRIGGER AS $$
BEGIN
  -- Only schedule if organization is approved
  IF NEW.admin_approved = true AND (OLD IS NULL OR OLD.admin_approved = false) THEN
    -- Schedule 4 quarterly reviews
    FOR i IN 0..3 LOOP
      INSERT INTO public.scheduled_reviews (
        organization_id, 
        review_type, 
        review_name, 
        scheduled_date, 
        due_date
      )
      VALUES (
        NEW.id,
        'quarterly',
        'Q' || ((EXTRACT(QUARTER FROM CURRENT_DATE) + i - 1) % 4 + 1)::TEXT || ' ' || 
        (EXTRACT(YEAR FROM CURRENT_DATE) + FLOOR((EXTRACT(QUARTER FROM CURRENT_DATE) + i - 1) / 4))::INTEGER::TEXT || 
        ' Compliance Review',
        (CURRENT_DATE + (i * 90 || ' days')::INTERVAL)::DATE,
        (CURRENT_DATE + ((i * 90) + 14 || ' days')::INTERVAL)::DATE
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-scheduling
DROP TRIGGER IF EXISTS auto_schedule_reviews_on_approval ON public.organizations;
CREATE TRIGGER auto_schedule_reviews_on_approval
  AFTER INSERT OR UPDATE OF admin_approved ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_schedule_quarterly_reviews();

-- =====================================================
-- PHASE 3.2: Supervisor Sign-Off System
-- =====================================================

-- Add supervisor signoff requirement to organizations
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS require_supervisor_signoff BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS signoff_competency_areas TEXT[] DEFAULT ARRAY['id_verification', 'product_knowledge', 'compliance_protocols'];

-- Create supervisor signoffs table
CREATE TABLE IF NOT EXISTS public.supervisor_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL,
  supervisor_user_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  competency_area TEXT NOT NULL CHECK (competency_area IN (
    'id_verification', 
    'product_knowledge', 
    'compliance_protocols', 
    'customer_service', 
    'diversion_prevention',
    'safety_procedures',
    'inventory_management',
    'pos_operations'
  )),
  signed_off_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  is_floor_observation BOOLEAN DEFAULT false,
  observation_date DATE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supervisor_signoffs ENABLE ROW LEVEL SECURITY;

-- RLS policies for supervisor_signoffs
CREATE POLICY "Employees can view their own signoffs"
  ON public.supervisor_signoffs FOR SELECT
  USING (employee_user_id = auth.uid());

CREATE POLICY "Supervisors can manage signoffs they created"
  ON public.supervisor_signoffs FOR ALL
  USING (supervisor_user_id = auth.uid());

CREATE POLICY "Admins can manage all signoffs"
  ON public.supervisor_signoffs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view their org signoffs"
  ON public.supervisor_signoffs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = supervisor_signoffs.organization_id
  ));

CREATE POLICY "Managers can create signoffs for their org"
  ON public.supervisor_signoffs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager', 'training_coordinator')
    AND p.organization_id = supervisor_signoffs.organization_id
  ));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_supervisor_signoffs_employee ON public.supervisor_signoffs(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_signoffs_org ON public.supervisor_signoffs(organization_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_signoffs_competency ON public.supervisor_signoffs(competency_area);

-- =====================================================
-- PHASE 3.3: Pipeline Compliance Health View
-- =====================================================

-- Create comprehensive compliance health view
CREATE OR REPLACE VIEW public.v_pipeline_compliance_health AS
SELECT 
  o.id as organization_id,
  o.name as organization_name,
  COUNT(DISTINCT p.user_id) as total_employees,
  COUNT(DISTINCT CASE WHEN c.id IS NOT NULL AND c.is_revoked = false AND (c.expiry_date IS NULL OR c.expiry_date > now()) THEN p.user_id END) as certified_employees,
  COUNT(DISTINCT CASE WHEN p.first_shift_date <= CURRENT_DATE AND c.id IS NULL THEN p.user_id END) as working_uncertified,
  COUNT(DISTINCT CASE WHEN ir.status = 'pending' THEN ir.user_id END) as pending_retraining,
  COUNT(DISTINCT CASE WHEN sr.due_date < CURRENT_DATE AND sr.status = 'scheduled' THEN sr.id END) as overdue_reviews,
  COUNT(DISTINCT CASE 
    WHEN o.require_supervisor_signoff = true 
    AND NOT EXISTS (
      SELECT 1 FROM supervisor_signoffs ss 
      WHERE ss.employee_user_id = p.user_id 
      AND ss.organization_id = o.id
    ) 
    THEN p.user_id 
  END) as missing_signoffs,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN p.first_shift_date <= CURRENT_DATE AND c.id IS NULL THEN p.user_id END) > 0 THEN 'critical'
    WHEN COUNT(DISTINCT CASE WHEN ir.status = 'pending' THEN ir.user_id END) > 0 THEN 'warning'
    WHEN COUNT(DISTINCT CASE WHEN sr.due_date < CURRENT_DATE AND sr.status = 'scheduled' THEN sr.id END) > 0 THEN 'warning'
    ELSE 'healthy'
  END as compliance_status,
  ROUND(
    CASE 
      WHEN COUNT(DISTINCT p.user_id) = 0 THEN 100
      ELSE (COUNT(DISTINCT CASE WHEN c.id IS NOT NULL AND c.is_revoked = false THEN p.user_id END)::NUMERIC / 
            NULLIF(COUNT(DISTINCT p.user_id), 0)::NUMERIC) * 100
    END, 1
  ) as certification_rate
FROM public.organizations o
LEFT JOIN public.profiles p ON p.organization_id = o.id
LEFT JOIN public.certificates c ON c.user_id = p.user_id
LEFT JOIN public.incident_retraining_assignments ir ON ir.user_id = p.user_id
LEFT JOIN public.scheduled_reviews sr ON sr.organization_id = o.id
WHERE o.admin_approved = true
GROUP BY o.id, o.name;