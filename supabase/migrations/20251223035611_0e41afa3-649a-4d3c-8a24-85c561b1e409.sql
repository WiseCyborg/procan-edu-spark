-- Add environment field to organizations for UAT vs Production separation
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'production';

-- Add check constraint for valid environment values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_environment_check'
  ) THEN
    ALTER TABLE organizations ADD CONSTRAINT organizations_environment_check 
      CHECK (environment IN ('uat', 'production'));
  END IF;
END $$;

-- Add production readiness tracking fields
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ready_for_production BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS uat_completed_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_attestation_signed BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_attestation_signed_at TIMESTAMPTZ;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS admin_attestation_signed_by UUID;

-- Create index for environment filtering
CREATE INDEX IF NOT EXISTS idx_organizations_environment ON organizations(environment);

-- Create index for production readiness queries
CREATE INDEX IF NOT EXISTS idx_organizations_production_ready ON organizations(ready_for_production) WHERE ready_for_production = true;