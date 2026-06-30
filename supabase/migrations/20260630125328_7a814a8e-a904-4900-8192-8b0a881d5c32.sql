
-- 1) course_modules.quiz_questions: revoke column access from anon (public courses still readable, but not the quiz answers)
REVOKE SELECT (quiz_questions) ON public.course_modules FROM anon;

-- 2) dispensary_applications: hash registration_token before storage, null plaintext
CREATE OR REPLACE FUNCTION public.hash_dispensary_registration_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.registration_token IS NOT NULL AND length(NEW.registration_token) > 0 THEN
    NEW.registration_token_hash := encode(extensions.digest(NEW.registration_token, 'sha256'), 'hex');
    NEW.registration_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_dispensary_registration_token ON public.dispensary_applications;
CREATE TRIGGER trg_hash_dispensary_registration_token
BEFORE INSERT OR UPDATE OF registration_token ON public.dispensary_applications
FOR EACH ROW EXECUTE FUNCTION public.hash_dispensary_registration_token();

-- Backfill: hash any existing plaintext tokens and null them
UPDATE public.dispensary_applications
SET registration_token_hash = COALESCE(
      registration_token_hash,
      encode(extensions.digest(registration_token, 'sha256'), 'hex')
    ),
    registration_token = NULL
WHERE registration_token IS NOT NULL;

-- 3) password_reset_tokens: hash token before storage, null plaintext
CREATE OR REPLACE FUNCTION public.hash_password_reset_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.token IS NOT NULL AND length(NEW.token) > 0 THEN
    NEW.token_hash := encode(extensions.digest(NEW.token, 'sha256'), 'hex');
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_password_reset_token ON public.password_reset_tokens;
CREATE TRIGGER trg_hash_password_reset_token
BEFORE INSERT OR UPDATE OF token ON public.password_reset_tokens
FOR EACH ROW EXECUTE FUNCTION public.hash_password_reset_token();

-- Backfill: hash any existing plaintext tokens and null them
UPDATE public.password_reset_tokens
SET token_hash = COALESCE(
      token_hash,
      encode(extensions.digest(token, 'sha256'), 'hex')
    ),
    token = NULL
WHERE token IS NOT NULL;
