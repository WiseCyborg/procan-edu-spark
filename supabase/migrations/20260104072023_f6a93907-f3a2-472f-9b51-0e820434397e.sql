
-- =====================================================
-- PII ENCRYPTION IMPLEMENTATION (FIXED)
-- Creates profiles_private table with encrypted fields
-- =====================================================

-- 1️⃣ Enable pgcrypto extension (required for encryption + hashing)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2️⃣ Create profiles_private table for encrypted PII
CREATE TABLE IF NOT EXISTS public.profiles_private (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_encrypted bytea,
  address_encrypted bytea,
  dob_encrypted bytea,
  emergency_contact_encrypted bytea,
  mca_number_encrypted bytea,
  encryption_version integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- 3️⃣ Enable RLS
ALTER TABLE public.profiles_private ENABLE ROW LEVEL SECURITY;

-- 4️⃣ RLS Policies
DROP POLICY IF EXISTS "Service role manages profiles_private" ON public.profiles_private;
CREATE POLICY "Service role manages profiles_private"
ON public.profiles_private FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

DROP POLICY IF EXISTS "Users view own private profile" ON public.profiles_private;
CREATE POLICY "Users view own private profile"
ON public.profiles_private FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins view profiles_private" ON public.profiles_private;
CREATE POLICY "Admins view profiles_private"
ON public.profiles_private FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND role = 'admin'
));

-- 5️⃣ Encryption functions using pgcrypto
CREATE OR REPLACE FUNCTION public.encrypt_pii(plaintext text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  encryption_key text;
BEGIN
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  
  RETURN extensions.pgp_sym_encrypt(plaintext, encryption_key);
END;
$$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(encrypted_data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  encryption_key text;
BEGIN
  IF current_setting('role', true) != 'service_role' AND 
     NOT EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can decrypt PII';
  END IF;

  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  
  IF encrypted_data IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN extensions.pgp_sym_decrypt(encrypted_data, encryption_key);
END;
$$;

-- 6️⃣ Upsert helper for encrypted profiles
CREATE OR REPLACE FUNCTION public.upsert_private_profile(
  p_user_id uuid,
  p_phone text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_dob text DEFAULT NULL,
  p_emergency_contact text DEFAULT NULL,
  p_mca_number text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  INSERT INTO profiles_private (
    user_id,
    phone_encrypted,
    address_encrypted,
    dob_encrypted,
    emergency_contact_encrypted,
    mca_number_encrypted,
    updated_at
  ) VALUES (
    p_user_id,
    CASE WHEN p_phone IS NOT NULL THEN encrypt_pii(p_phone) ELSE NULL END,
    CASE WHEN p_address IS NOT NULL THEN encrypt_pii(p_address) ELSE NULL END,
    CASE WHEN p_dob IS NOT NULL THEN encrypt_pii(p_dob) ELSE NULL END,
    CASE WHEN p_emergency_contact IS NOT NULL THEN encrypt_pii(p_emergency_contact) ELSE NULL END,
    CASE WHEN p_mca_number IS NOT NULL THEN encrypt_pii(p_mca_number) ELSE NULL END,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    phone_encrypted = COALESCE(
      CASE WHEN p_phone IS NOT NULL THEN encrypt_pii(p_phone) ELSE NULL END,
      profiles_private.phone_encrypted
    ),
    address_encrypted = COALESCE(
      CASE WHEN p_address IS NOT NULL THEN encrypt_pii(p_address) ELSE NULL END,
      profiles_private.address_encrypted
    ),
    dob_encrypted = COALESCE(
      CASE WHEN p_dob IS NOT NULL THEN encrypt_pii(p_dob) ELSE NULL END,
      profiles_private.dob_encrypted
    ),
    emergency_contact_encrypted = COALESCE(
      CASE WHEN p_emergency_contact IS NOT NULL THEN encrypt_pii(p_emergency_contact) ELSE NULL END,
      profiles_private.emergency_contact_encrypted
    ),
    mca_number_encrypted = COALESCE(
      CASE WHEN p_mca_number IS NOT NULL THEN encrypt_pii(p_mca_number) ELSE NULL END,
      profiles_private.mca_number_encrypted
    ),
    updated_at = NOW();
END;
$$;

-- 7️⃣ Secure read function
CREATE OR REPLACE FUNCTION public.get_private_profile(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  phone text,
  address text,
  dob text,
  emergency_contact text,
  mca_number text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() != p_user_id AND 
     current_setting('role', true) != 'service_role' AND 
     NOT EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Cannot access this profile';
  END IF;

  RETURN QUERY
  SELECT 
    pp.user_id,
    decrypt_pii(pp.phone_encrypted) as phone,
    decrypt_pii(pp.address_encrypted) as address,
    decrypt_pii(pp.dob_encrypted) as dob,
    decrypt_pii(pp.emergency_contact_encrypted) as emergency_contact,
    decrypt_pii(pp.mca_number_encrypted) as mca_number
  FROM profiles_private pp
  WHERE pp.user_id = p_user_id;
END;
$$;

-- 8️⃣ Token hashing functions (using extensions schema)
CREATE OR REPLACE FUNCTION public.hash_token(token text)
RETURNS text
LANGUAGE sql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT encode(extensions.digest(token::bytea, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.verify_token_hash(token text, stored_hash text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
  SELECT encode(extensions.digest(token::bytea, 'sha256'), 'hex') = stored_hash;
$$;

-- 9️⃣ Add hashed token columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dispensary_applications' 
    AND column_name = 'registration_token_hash'
  ) THEN
    ALTER TABLE dispensary_applications ADD COLUMN registration_token_hash text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_invitations' 
    AND column_name = 'invitation_token_hash'
  ) THEN
    ALTER TABLE staff_invitations ADD COLUMN invitation_token_hash text;
  END IF;
END $$;

-- 🔟 Auto-hash trigger for registration tokens
CREATE OR REPLACE FUNCTION public.auto_hash_registration_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  IF NEW.registration_token IS NOT NULL THEN
    NEW.registration_token_hash := hash_token(NEW.registration_token);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_registration_token_trigger ON dispensary_applications;
CREATE TRIGGER hash_registration_token_trigger
  BEFORE INSERT OR UPDATE OF registration_token ON dispensary_applications
  FOR EACH ROW
  EXECUTE FUNCTION auto_hash_registration_token();

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_profiles_private_updated_at ON profiles_private;
CREATE TRIGGER update_profiles_private_updated_at
  BEFORE UPDATE ON profiles_private
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_private_user_id ON profiles_private(user_id);
