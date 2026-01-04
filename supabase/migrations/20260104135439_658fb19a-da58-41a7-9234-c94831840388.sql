-- ============================================
-- SECURITY HARDENING: profiles + profiles_private
-- ============================================

-- Step 1: Lock down profiles_private to service_role only
-- Remove authenticated user access - Edge Functions are the only gate
DROP POLICY IF EXISTS "Users view own private profile" ON profiles_private;
DROP POLICY IF EXISTS "Admins view profiles_private" ON profiles_private;

-- Revoke all access from authenticated users
REVOKE ALL ON TABLE profiles_private FROM anon;
REVOKE ALL ON TABLE profiles_private FROM authenticated;

-- Only service_role can access (Edge Functions use this)
CREATE POLICY "Service role only access"
ON profiles_private
FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

-- Step 2: Clear PII from profiles table (move to encrypted storage)
-- NOTE: This sets columns to NULL - data should already be in profiles_private via Edge Functions
-- Keeping columns for backward compatibility but emptying sensitive data
UPDATE profiles SET
  phone = NULL,
  date_of_birth = NULL,
  address = NULL,
  city = NULL,
  state = NULL,
  zip_code = NULL,
  emergency_contact_name = NULL,
  emergency_contact_phone = NULL,
  mca_registration_number = NULL
WHERE phone IS NOT NULL 
   OR date_of_birth IS NOT NULL 
   OR address IS NOT NULL
   OR emergency_contact_name IS NOT NULL
   OR mca_registration_number IS NOT NULL;

-- Step 3: Add comments to deprecated PII columns
COMMENT ON COLUMN profiles.phone IS 'DEPRECATED: Use profiles_private.phone_encrypted via Edge Function';
COMMENT ON COLUMN profiles.date_of_birth IS 'DEPRECATED: Use profiles_private.dob_encrypted via Edge Function';
COMMENT ON COLUMN profiles.address IS 'DEPRECATED: Use profiles_private.address_encrypted via Edge Function';
COMMENT ON COLUMN profiles.emergency_contact_name IS 'DEPRECATED: Use profiles_private.emergency_contact_encrypted via Edge Function';
COMMENT ON COLUMN profiles.mca_registration_number IS 'DEPRECATED: Use profiles_private.mca_number_encrypted via Edge Function';