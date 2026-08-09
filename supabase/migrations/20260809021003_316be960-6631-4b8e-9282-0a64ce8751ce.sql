-- pgcrypto's digest() lives in the `extensions` schema; these five token-hashing
-- trigger functions had it excluded from their search_path, so every hash failed.
-- This restores access to digest() without changing any hashing logic.
ALTER FUNCTION public.hash_staff_invitation_token() SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.hash_registration_token()     SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.hash_password_reset_token()   SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.hash_verification_code()      SET search_path TO public, extensions, pg_temp;
ALTER FUNCTION public.hash_org_invite_token()       SET search_path TO public, extensions, pg_temp;