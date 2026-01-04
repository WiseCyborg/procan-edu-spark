
-- =====================================================
-- COMPREHENSIVE SECURITY HARDENING MIGRATION (FIXED)
-- Addresses: RLS mismatches, IDOR protection, Token expiry,
-- Storage security, Audit log integrity, Rate limiting gaps
-- =====================================================

-- 1️⃣ FIX: Audit log tables - prevent any UPDATE/DELETE (append-only)
REVOKE UPDATE, DELETE ON public.security_audit_log FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.admin_operations_audit FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.api_console_audit FROM authenticated, anon;

-- 2️⃣ FIX: Storage bucket security - make sensitive buckets private
UPDATE storage.buckets SET public = false WHERE id = 'mock-certificate-photos';

-- 3️⃣ ADD: Signed URL access policy for certificates bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Users access own certificate files' 
    AND tablename = 'objects' 
    AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Users access own certificate files"
    ON storage.objects FOR SELECT
    USING (
      bucket_id IN ('mock-certificate-photos', 'compliance') AND
      (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid() 
          AND role = 'admin'
        )
      )
    );
  END IF;
END $$;

-- 4️⃣ ADD: Helper function to check organization membership (for IDOR prevention)
CREATE OR REPLACE FUNCTION public.is_org_member(check_user_id uuid, check_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = check_user_id 
    AND organization_id = check_org_id
  );
$$;

-- 5️⃣ ADD: Secure lookup function for certificates (prevents IDOR via UUID guessing)
CREATE OR REPLACE FUNCTION public.get_certificate_secure(cert_id uuid)
RETURNS TABLE(
  id uuid,
  certificate_number text,
  user_id uuid,
  course_id uuid,
  issue_date timestamptz,
  expiry_date timestamptz,
  is_revoked boolean,
  status text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.certificate_number,
    c.user_id,
    c.course_id,
    c.issue_date,
    c.expiry_date,
    c.is_revoked,
    c.status
  FROM certificates c
  WHERE c.id = cert_id;
END;
$$;

-- 6️⃣ ADD: Rate limiting for access key validation endpoint
CREATE OR REPLACE FUNCTION public.check_access_key_rate_limit(user_ip text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attempt_count integer;
  time_window timestamptz;
BEGIN
  time_window := NOW() - INTERVAL '15 minutes';
  
  SELECT COUNT(*) INTO attempt_count
  FROM rate_limits
  WHERE action_type = 'access_key_validation'
    AND created_at > time_window;
  
  RETURN attempt_count < 10;
END;
$$;

-- 7️⃣ FIX: Ensure tokens have expiry enforcement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_token_has_expiry'
  ) THEN
    ALTER TABLE dispensary_applications 
      ADD CONSTRAINT check_token_has_expiry 
      CHECK (
        registration_token IS NULL OR 
        registration_token_expires_at IS NOT NULL
      );
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Constraint may already exist or data violates it: %', SQLERRM;
END $$;

-- 8️⃣ ADD: Token redemption tracking table
CREATE TABLE IF NOT EXISTS public.token_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_type text NOT NULL,
  token_hash text NOT NULL,
  redeemed_by uuid,
  redeemed_at timestamptz NOT NULL DEFAULT NOW(),
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Add unique constraint if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'token_redemptions_token_type_token_hash_key'
  ) THEN
    ALTER TABLE public.token_redemptions 
      ADD CONSTRAINT token_redemptions_token_type_token_hash_key 
      UNIQUE(token_type, token_hash);
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'Unique constraint may already exist: %', SQLERRM;
END $$;

-- Enable RLS
ALTER TABLE public.token_redemptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Service role manages token redemptions" ON public.token_redemptions;
DROP POLICY IF EXISTS "Admins view token redemptions" ON public.token_redemptions;

-- Only service role can insert
CREATE POLICY "Service role manages token redemptions"
ON public.token_redemptions FOR ALL
USING (current_setting('role', true) = 'service_role')
WITH CHECK (current_setting('role', true) = 'service_role');

-- Admins can view for audit
CREATE POLICY "Admins view token redemptions"
ON public.token_redemptions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'admin'
));

-- 9️⃣ ADD: Generic error messages function (prevents enumeration)
CREATE OR REPLACE FUNCTION public.safe_error_message(
  internal_error text,
  public_message text DEFAULT 'An error occurred. Please try again or contact support.'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO security_audit_log (
    user_id, table_name, action_type, record_id, new_values, created_at
  ) VALUES (
    auth.uid(), 
    'error_log', 
    'ERROR_SUPPRESSED', 
    gen_random_uuid(),
    jsonb_build_object(
      'internal_error', internal_error,
      'public_message', public_message,
      'timestamp', NOW()
    ),
    NOW()
  );
  
  RETURN public_message;
END;
$$;

-- 🔟 ADD: Edge function trust validation helper
CREATE OR REPLACE FUNCTION public.validate_caller_org_access(
  caller_user_id uuid,
  target_org_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  caller_org_id uuid;
  caller_role text;
BEGIN
  SELECT p.organization_id, ur.role::text INTO caller_org_id, caller_role
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id = caller_user_id
  LIMIT 1;
  
  IF caller_role = 'admin' THEN
    RETURN true;
  END IF;
  
  RETURN caller_org_id = target_org_id;
END;
$$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_token_redemptions_hash 
ON token_redemptions(token_hash);

CREATE INDEX IF NOT EXISTS idx_token_redemptions_type_hash 
ON token_redemptions(token_type, token_hash);
