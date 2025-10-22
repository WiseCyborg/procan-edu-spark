-- Create rvt_join_codes table for employee enrollment
CREATE TABLE IF NOT EXISTS rvt_join_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_join_codes_org ON rvt_join_codes(organization_id);
CREATE INDEX IF NOT EXISTS idx_join_codes_code ON rvt_join_codes(code);

-- Enable RLS
ALTER TABLE rvt_join_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Allow managers to view their org's codes
CREATE POLICY "Managers can view organization codes"
ON rvt_join_codes FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Service role can manage join codes
CREATE POLICY "Service role can manage join codes"
ON rvt_join_codes FOR ALL
USING (current_setting('role') = 'service_role');

-- Policy: Anyone can validate join codes (for registration)
CREATE POLICY "Anyone can validate join codes"
ON rvt_join_codes FOR SELECT
USING (is_active = true);