-- ============================================
-- Unified Compliance Enhancement Migration
-- ============================================

-- 1. Certificate Auto-Expiry Status
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS status TEXT 
  DEFAULT 'active' CHECK (status IN ('active','expired','revoked'));

-- Trigger to auto-update certificate status
CREATE OR REPLACE FUNCTION sync_certificate_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_revoked = true THEN
    NEW.status := 'revoked';
  ELSIF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= NOW() THEN
    NEW.status := 'expired';
  ELSE
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_certificate_status ON certificates;
CREATE TRIGGER trg_sync_certificate_status
BEFORE INSERT OR UPDATE ON certificates
FOR EACH ROW EXECUTE FUNCTION sync_certificate_status();

-- 2. Add version tracking to course_modules
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- 3. Add signoff validity tracking to supervisor_signoffs
ALTER TABLE supervisor_signoffs ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES course_modules(id);
ALTER TABLE supervisor_signoffs ADD COLUMN IF NOT EXISTS module_version INTEGER;
ALTER TABLE supervisor_signoffs ADD COLUMN IF NOT EXISTS valid BOOLEAN DEFAULT true;
ALTER TABLE supervisor_signoffs ADD COLUMN IF NOT EXISTS invalidated_at TIMESTAMPTZ;
ALTER TABLE supervisor_signoffs ADD COLUMN IF NOT EXISTS invalidation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_supervisor_signoffs_valid ON supervisor_signoffs(valid) WHERE valid = true;

-- 4. Create retraining_events table
CREATE TABLE IF NOT EXISTS retraining_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES course_modules(id),
  reason TEXT NOT NULL,
  triggered_by UUID,
  incident_id UUID REFERENCES compliance_incidents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retraining_events_org ON retraining_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_retraining_events_employee ON retraining_events(employee_user_id);

ALTER TABLE retraining_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org managers can manage retraining events"
ON retraining_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'dispensary_manager', 'training_coordinator')
    AND (p.organization_id = retraining_events.organization_id OR ur.role = 'admin')
  )
);

CREATE POLICY "Employees can view their retraining events"
ON retraining_events FOR SELECT
USING (employee_user_id = auth.uid());

-- 5. Invalidate signoffs on retraining assignment
CREATE OR REPLACE FUNCTION invalidate_signoffs_on_retraining()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE supervisor_signoffs
  SET valid = false,
      invalidated_at = NOW(),
      invalidation_reason = 'Retraining assigned: ' || NEW.reason
  WHERE organization_id = NEW.organization_id
    AND employee_user_id = NEW.employee_user_id
    AND module_id = NEW.module_id
    AND valid = true;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invalidate_signoffs_on_retraining ON retraining_events;
CREATE TRIGGER trg_invalidate_signoffs_on_retraining
AFTER INSERT ON retraining_events
FOR EACH ROW EXECUTE FUNCTION invalidate_signoffs_on_retraining();

-- 6. Invalidate signoffs when module version bumps
CREATE OR REPLACE FUNCTION invalidate_signoffs_on_module_version_bump()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.version IS DISTINCT FROM OLD.version THEN
    UPDATE supervisor_signoffs
    SET valid = false,
        invalidated_at = NOW(),
        invalidation_reason = 'Module updated to version ' || NEW.version
    WHERE module_id = NEW.id
      AND valid = true;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_invalidate_on_version_bump ON course_modules;
CREATE TRIGGER trg_invalidate_on_version_bump
AFTER UPDATE ON course_modules
FOR EACH ROW EXECUTE FUNCTION invalidate_signoffs_on_module_version_bump();

-- 7. Create compliance_packets table for export tracking
CREATE TABLE IF NOT EXISTS compliance_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  employee_user_id UUID,
  packet_type TEXT NOT NULL DEFAULT 'employee' CHECK (packet_type IN ('employee', 'organization', 'incident', 'audit')),
  storage_path TEXT,
  file_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_packets_org ON compliance_packets(organization_id);

ALTER TABLE compliance_packets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org managers can view compliance packets"
ON compliance_packets FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'dispensary_manager', 'training_coordinator')
    AND (p.organization_id = compliance_packets.organization_id OR ur.role = 'admin')
  )
);

CREATE POLICY "Org managers can create compliance packets"
ON compliance_packets FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'dispensary_manager', 'training_coordinator')
    AND (p.organization_id = compliance_packets.organization_id OR ur.role = 'admin')
  )
);

-- 8. JWT Helper Functions for RLS
CREATE OR REPLACE FUNCTION jwt_org_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'org_id','')::uuid
$$;

CREATE OR REPLACE FUNCTION jwt_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>'role'
$$;

-- 9. Update existing certificates to set initial status
UPDATE certificates 
SET status = CASE 
  WHEN is_revoked = true THEN 'revoked'
  WHEN expiry_date IS NOT NULL AND expiry_date <= NOW() THEN 'expired'
  ELSE 'active'
END
WHERE status IS NULL;