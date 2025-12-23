-- ============================================
-- PHASE 1: CRITICAL COMPLIANCE INFRASTRUCTURE
-- ============================================

-- =============================================
-- 1.1 TRAINER ROLE & CERTIFICATION SYSTEM
-- =============================================

-- Add 'trainer' to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'trainer' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'trainer';
  END IF;
END $$;

-- Create trainer_certifications table
CREATE TABLE IF NOT EXISTS public.trainer_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL DEFAULT 'internal', -- 'internal', 'mca_approved', 'external'
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  authorized_by UUID REFERENCES auth.users(id),
  authorized_at TIMESTAMPTZ DEFAULT now(),
  scope JSONB DEFAULT '{"modules": [], "all_modules": true}'::jsonb, -- Which modules they can teach
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'expired', 'revoked'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Add trainer_id to user_progress to track "who trained this employee"
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'trainer_id') THEN
    ALTER TABLE user_progress ADD COLUMN trainer_id UUID REFERENCES auth.users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_progress' AND column_name = 'training_method') THEN
    ALTER TABLE user_progress ADD COLUMN training_method TEXT DEFAULT 'self_paced'; -- 'self_paced', 'instructor_led', 'blended'
  END IF;
END $$;

-- Enable RLS on trainer_certifications
ALTER TABLE trainer_certifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for trainer_certifications
CREATE POLICY "Admins can manage all trainer certifications" ON trainer_certifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can manage org trainer certs" ON trainer_certifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
      AND p.organization_id = trainer_certifications.organization_id
    )
  );

CREATE POLICY "Trainers can view their own certifications" ON trainer_certifications
  FOR SELECT USING (user_id = auth.uid());

-- =============================================
-- 1.2 MODULE ATTESTATION SYSTEM
-- =============================================

CREATE TABLE IF NOT EXISTS public.module_attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  attested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attestation_text TEXT NOT NULL DEFAULT 'I acknowledge that I have reviewed and understand the material presented in this module.',
  ip_address INET,
  user_agent TEXT,
  trainer_id UUID REFERENCES auth.users(id), -- If instructor-led
  curriculum_version_id UUID, -- Track which version was studied
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- Enable RLS on module_attestations
ALTER TABLE module_attestations ENABLE ROW LEVEL SECURITY;

-- RLS policies for module_attestations
CREATE POLICY "Users can create their own attestations" ON module_attestations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attestations" ON module_attestations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attestations" ON module_attestations
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can view org attestations" ON module_attestations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p1
      JOIN profiles p2 ON p1.organization_id = p2.organization_id
      JOIN user_roles ur ON ur.user_id = p2.user_id
      WHERE p1.user_id = module_attestations.user_id
      AND p2.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
    )
  );

-- =============================================
-- 1.3 INCIDENT TRACKING & RETRAINING TRIGGERS
-- =============================================

-- Create incident severity enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_severity') THEN
    CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
  END IF;
END $$;

-- Create incident status enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'incident_status') THEN
    CREATE TYPE incident_status AS ENUM ('reported', 'investigating', 'resolved', 'closed');
  END IF;
END $$;

-- Create compliance_incidents table
CREATE TABLE IF NOT EXISTS public.compliance_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL, -- 'customer_complaint', 'regulatory_violation', 'diversion_concern', 'documentation_failure', 'id_verification_failure', 'product_handling', 'safety_violation'
  description TEXT NOT NULL,
  severity incident_severity NOT NULL DEFAULT 'medium',
  status incident_status NOT NULL DEFAULT 'reported',
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create incident_retraining_assignments table
CREATE TABLE IF NOT EXISTS public.incident_retraining_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES compliance_incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'overdue'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(incident_id, user_id, module_id)
);

-- Auto-assign modules based on incident type
CREATE TABLE IF NOT EXISTS public.incident_module_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_type TEXT NOT NULL,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(incident_type, module_id)
);

-- Enable RLS
ALTER TABLE compliance_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_retraining_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_module_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policies for compliance_incidents
CREATE POLICY "Admins can manage all incidents" ON compliance_incidents
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org managers can manage org incidents" ON compliance_incidents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p ON p.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
      AND p.organization_id = compliance_incidents.organization_id
    )
  );

CREATE POLICY "Employees can view incidents they're involved in" ON compliance_incidents
  FOR SELECT USING (employee_user_id = auth.uid() OR reported_by = auth.uid());

-- RLS policies for incident_retraining_assignments
CREATE POLICY "Admins can manage all retraining" ON incident_retraining_assignments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own retraining" ON incident_retraining_assignments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Org managers can manage org retraining" ON incident_retraining_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM compliance_incidents ci
      JOIN profiles p ON p.organization_id = ci.organization_id
      JOIN user_roles ur ON ur.user_id = p.user_id
      WHERE ci.id = incident_retraining_assignments.incident_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
    )
  );

-- RLS policies for incident_module_mappings
CREATE POLICY "Anyone can view incident module mappings" ON incident_module_mappings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage incident module mappings" ON incident_module_mappings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 1.4 ROLE-SPECIFIC LEARNING PATHS
-- =============================================

-- Create job_role enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_role') THEN
    CREATE TYPE job_role AS ENUM ('budtender', 'security', 'intake', 'operations', 'manager', 'owner', 'trainer');
  END IF;
END $$;

-- Add job_role to profiles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'job_role') THEN
    ALTER TABLE profiles ADD COLUMN job_role job_role;
  END IF;
END $$;

-- Role module requirements mapping
CREATE TABLE IF NOT EXISTS public.role_module_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_role job_role NOT NULL,
  module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  is_required BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_role, module_id)
);

-- Enable RLS
ALTER TABLE role_module_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_module_requirements
CREATE POLICY "Anyone can view role requirements" ON role_module_requirements
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage role requirements" ON role_module_requirements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE TRIGGER update_trainer_certifications_updated_at
  BEFORE UPDATE ON trainer_certifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_compliance_incidents_updated_at
  BEFORE UPDATE ON compliance_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_incident_retraining_assignments_updated_at
  BEFORE UPDATE ON incident_retraining_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_trainer_certifications_user_id ON trainer_certifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_certifications_org_id ON trainer_certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_trainer_certifications_status ON trainer_certifications(status);

CREATE INDEX IF NOT EXISTS idx_module_attestations_user_id ON module_attestations(user_id);
CREATE INDEX IF NOT EXISTS idx_module_attestations_module_id ON module_attestations(module_id);

CREATE INDEX IF NOT EXISTS idx_compliance_incidents_org_id ON compliance_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_employee ON compliance_incidents(employee_user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_status ON compliance_incidents(status);
CREATE INDEX IF NOT EXISTS idx_compliance_incidents_severity ON compliance_incidents(severity);

CREATE INDEX IF NOT EXISTS idx_incident_retraining_user_id ON incident_retraining_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_incident_retraining_status ON incident_retraining_assignments(status);

CREATE INDEX IF NOT EXISTS idx_profiles_job_role ON profiles(job_role);

CREATE INDEX IF NOT EXISTS idx_role_module_req_role ON role_module_requirements(job_role);

-- =============================================
-- SEED DEFAULT INCIDENT MODULE MAPPINGS
-- =============================================

-- Get first course module IDs to map incidents to appropriate training
-- This will be customized by admins but provides sensible defaults
INSERT INTO incident_module_mappings (incident_type, module_id, is_required)
SELECT 'id_verification_failure', id, true FROM course_modules WHERE module_number = 8 LIMIT 1
ON CONFLICT (incident_type, module_id) DO NOTHING;

INSERT INTO incident_module_mappings (incident_type, module_id, is_required)
SELECT 'diversion_concern', id, true FROM course_modules WHERE module_number = 9 LIMIT 1
ON CONFLICT (incident_type, module_id) DO NOTHING;

INSERT INTO incident_module_mappings (incident_type, module_id, is_required)
SELECT 'product_handling', id, true FROM course_modules WHERE module_number = 6 LIMIT 1
ON CONFLICT (incident_type, module_id) DO NOTHING;

INSERT INTO incident_module_mappings (incident_type, module_id, is_required)
SELECT 'customer_complaint', id, true FROM course_modules WHERE module_number = 7 LIMIT 1
ON CONFLICT (incident_type, module_id) DO NOTHING;

INSERT INTO incident_module_mappings (incident_type, module_id, is_required)
SELECT 'regulatory_violation', id, true FROM course_modules WHERE module_number = 3 LIMIT 1
ON CONFLICT (incident_type, module_id) DO NOTHING;

INSERT INTO incident_module_mappings (incident_type, module_id, is_required)
SELECT 'safety_violation', id, true FROM course_modules WHERE module_number = 10 LIMIT 1
ON CONFLICT (incident_type, module_id) DO NOTHING;