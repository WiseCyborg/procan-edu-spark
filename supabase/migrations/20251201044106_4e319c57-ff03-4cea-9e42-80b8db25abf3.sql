-- Create UAT accounts tracking table
CREATE TABLE uat_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_type TEXT NOT NULL CHECK (account_type IN ('manager', 'employee', 'coordinator', 'admin')),
  email TEXT NOT NULL,
  password_hint TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  last_reset_at TIMESTAMPTZ,
  reset_count INT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Add index for faster lookups
CREATE INDEX idx_uat_accounts_user_id ON uat_accounts(user_id);
CREATE INDEX idx_uat_accounts_email ON uat_accounts(email);
CREATE INDEX idx_uat_accounts_organization_id ON uat_accounts(organization_id);

-- Enable RLS
ALTER TABLE uat_accounts ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can manage UAT accounts"
  ON uat_accounts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add comment
COMMENT ON TABLE uat_accounts IS 'Tracks UAT test accounts for Admin Mission Control management and reset operations';