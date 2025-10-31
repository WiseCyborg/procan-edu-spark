-- Phase 1: Create Database Triggers & Update Schema

-- 1.1 Add columns to staff_invitations table
ALTER TABLE staff_invitations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS resend_count INTEGER DEFAULT 0;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON staff_invitations(status);

-- 1.2 Create trigger for manager registration complete
CREATE OR REPLACE FUNCTION trigger_manager_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_profile RECORD;
  org_info RECORD;
BEGIN
  -- Only trigger if registration was just completed
  IF NEW.registration_completed = true AND (OLD.registration_completed IS NULL OR OLD.registration_completed = false) THEN
    
    -- Get manager profile
    SELECT p.*, au.email 
    INTO manager_profile
    FROM profiles p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.organization_id = NEW.organization_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.user_id 
      AND ur.role = 'dispensary_manager'
    )
    LIMIT 1;
    
    -- Get organization info
    SELECT * INTO org_info
    FROM organizations
    WHERE id = NEW.organization_id;
    
    -- Call welcome email edge function (async, won't block)
    IF manager_profile.user_id IS NOT NULL THEN
      PERFORM net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-welcome-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := jsonb_build_object(
          'userId', manager_profile.user_id,
          'email', manager_profile.email,
          'firstName', manager_profile.first_name,
          'organizationName', org_info.name
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_manager_registration_complete ON dispensary_applications;
CREATE TRIGGER on_manager_registration_complete
  AFTER UPDATE ON dispensary_applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_manager_welcome_email();

-- 1.3 Create trigger for certificate issuance
CREATE OR REPLACE FUNCTION trigger_certificate_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call certificate email edge function (async)
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/trigger-certificate-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := jsonb_build_object(
      'certificateId', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_certificate_issued ON certificates;
CREATE TRIGGER on_certificate_issued
  AFTER INSERT ON certificates
  FOR EACH ROW
  EXECUTE FUNCTION trigger_certificate_email();

-- 1.4 Ensure profile linking for managers
CREATE OR REPLACE FUNCTION ensure_manager_profile_linking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When manager role is assigned, ensure profile is linked to organization
  IF NEW.role = 'dispensary_manager' THEN
    UPDATE profiles
    SET organization_id = (
      SELECT organization_id 
      FROM dispensary_applications
      WHERE reviewed_by IS NOT NULL
      AND registration_completed = true
      AND organization_id IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1
    )
    WHERE user_id = NEW.user_id
    AND organization_id IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_manager_role_assigned ON user_roles;
CREATE TRIGGER on_manager_role_assigned
  AFTER INSERT ON user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'dispensary_manager')
  EXECUTE FUNCTION ensure_manager_profile_linking();

-- Phase 3: Production Safety - Add expires_at to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Set expiry for existing test organizations (30 days from creation)
UPDATE organizations
SET expires_at = created_at + INTERVAL '30 days'
WHERE payment_status = 'test'
AND expires_at IS NULL;

-- Create function to expire test organizations
CREATE OR REPLACE FUNCTION expire_test_organizations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organizations
  SET admin_approved = false
  WHERE payment_status = 'test'
  AND expires_at < NOW()
  AND admin_approved = true;
END;
$$;