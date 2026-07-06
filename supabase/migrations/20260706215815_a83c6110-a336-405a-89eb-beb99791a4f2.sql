
-- Ensure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================================
-- 1. email_verification_codes: hash + null plaintext, drop user SELECT policy
-- =========================================================================
ALTER TABLE public.email_verification_codes
  ADD COLUMN IF NOT EXISTS code_hash text;

ALTER TABLE public.email_verification_codes
  ALTER COLUMN code DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.hash_verification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.code IS NOT NULL AND NEW.code <> 'VONAGE_MANAGED' THEN
    IF NEW.code_hash IS NULL THEN
      NEW.code_hash := encode(digest(NEW.code, 'sha256'), 'hex');
    END IF;
    NEW.code := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_verification_code ON public.email_verification_codes;
CREATE TRIGGER trg_hash_verification_code
  BEFORE INSERT OR UPDATE ON public.email_verification_codes
  FOR EACH ROW EXECUTE FUNCTION public.hash_verification_code();

-- Backfill existing rows: hash any plaintext codes still at rest
UPDATE public.email_verification_codes
SET code_hash = encode(digest(code, 'sha256'), 'hex'),
    code = NULL
WHERE code IS NOT NULL AND code <> 'VONAGE_MANAGED' AND code_hash IS NULL;

-- Remove user-facing SELECT policy: users don't need to read codes back
DROP POLICY IF EXISTS "Users can view their own verification codes" ON public.email_verification_codes;

-- =========================================================================
-- 2. org_invites: hash + null plaintext token
-- =========================================================================
CREATE OR REPLACE FUNCTION public.hash_org_invite_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.token IS NOT NULL THEN
    IF NEW.token_hash IS NULL THEN
      NEW.token_hash := encode(digest(NEW.token, 'sha256'), 'hex');
    END IF;
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_org_invite_token ON public.org_invites;
CREATE TRIGGER trg_hash_org_invite_token
  BEFORE INSERT OR UPDATE ON public.org_invites
  FOR EACH ROW EXECUTE FUNCTION public.hash_org_invite_token();

UPDATE public.org_invites
SET token_hash = COALESCE(token_hash, encode(digest(token, 'sha256'), 'hex')),
    token = NULL
WHERE token IS NOT NULL;

-- =========================================================================
-- 3. password_reset_tokens: hash + null plaintext token
-- =========================================================================
CREATE OR REPLACE FUNCTION public.hash_password_reset_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.token IS NOT NULL THEN
    IF NEW.token_hash IS NULL THEN
      NEW.token_hash := encode(digest(NEW.token, 'sha256'), 'hex');
    END IF;
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_password_reset_token ON public.password_reset_tokens;
CREATE TRIGGER trg_hash_password_reset_token
  BEFORE INSERT OR UPDATE ON public.password_reset_tokens
  FOR EACH ROW EXECUTE FUNCTION public.hash_password_reset_token();

UPDATE public.password_reset_tokens
SET token_hash = COALESCE(token_hash, encode(digest(token, 'sha256'), 'hex')),
    token = NULL
WHERE token IS NOT NULL;

-- =========================================================================
-- 4. dispensary_applications: hash + null plaintext registration_token
-- =========================================================================
CREATE OR REPLACE FUNCTION public.hash_registration_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.registration_token IS NOT NULL THEN
    IF NEW.registration_token_hash IS NULL THEN
      NEW.registration_token_hash := encode(digest(NEW.registration_token, 'sha256'), 'hex');
    END IF;
    NEW.registration_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_registration_token ON public.dispensary_applications;
CREATE TRIGGER trg_hash_registration_token
  BEFORE INSERT OR UPDATE ON public.dispensary_applications
  FOR EACH ROW EXECUTE FUNCTION public.hash_registration_token();

UPDATE public.dispensary_applications
SET registration_token_hash = COALESCE(registration_token_hash, encode(digest(registration_token, 'sha256'), 'hex')),
    registration_token = NULL
WHERE registration_token IS NOT NULL;

-- =========================================================================
-- 5. profiles_private: tighten policies to target service_role role directly
-- =========================================================================
DROP POLICY IF EXISTS "Service role manages profiles_private" ON public.profiles_private;
DROP POLICY IF EXISTS "Service role only access" ON public.profiles_private;

CREATE POLICY "Service role only access"
  ON public.profiles_private
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
