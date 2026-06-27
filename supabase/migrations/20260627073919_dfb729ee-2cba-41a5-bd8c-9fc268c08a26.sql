
-- 1) compliance_metrics: explicit NOT NULL guard
DROP POLICY IF EXISTS "Organization managers can view their metrics" ON public.compliance_metrics;
CREATE POLICY "Organization managers can view their metrics"
ON public.compliance_metrics
FOR SELECT
USING (
  compliance_metrics.organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'dispensary_manager'::app_role
      AND p.organization_id IS NOT NULL
      AND p.organization_id = compliance_metrics.organization_id
  )
);

-- 2) organization_members: restrict email branch to pending invites only
DROP POLICY IF EXISTS "Users view own memberships" ON public.organization_members;
CREATE POLICY "Users view own memberships"
ON public.organization_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR (email = auth.email() AND status = 'invited')
);

-- 3) dispensary_applications: stop storing plaintext registration tokens
CREATE OR REPLACE FUNCTION public.auto_hash_registration_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
  IF NEW.registration_token IS NOT NULL THEN
    NEW.registration_token_hash := public.hash_token(NEW.registration_token);
    -- Never persist plaintext token at rest
    NEW.registration_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Validate by hash instead of plaintext
CREATE OR REPLACE FUNCTION public.validate_registration_token(token_value text)
RETURNS TABLE(is_valid boolean, application_id uuid, organization_id uuid, organization_name text, expires_at timestamp with time zone, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  app_record RECORD;
  token_hash text;
BEGIN
  token_hash := public.hash_token(token_value);

  SELECT
    da.id,
    da.organization_id,
    da.organization_name,
    da.registration_token_expires_at,
    da.registration_completed
  INTO app_record
  FROM public.dispensary_applications da
  WHERE da.registration_token_hash = token_hash
    AND da.application_status = 'approved';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TIMESTAMPTZ, 'Invalid registration token'::TEXT;
    RETURN;
  END IF;

  IF app_record.registration_completed THEN
    RETURN QUERY SELECT FALSE, app_record.id, app_record.organization_id, app_record.organization_name, app_record.registration_token_expires_at, 'Registration already completed'::TEXT;
    RETURN;
  END IF;

  IF app_record.registration_token_expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, app_record.id, app_record.organization_id, app_record.organization_name, app_record.registration_token_expires_at, 'Registration token expired'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, app_record.id, app_record.organization_id, app_record.organization_name, app_record.registration_token_expires_at, NULL::TEXT;
END;
$function$;

-- Backfill: ensure hashes exist for any rows still holding plaintext, then clear plaintext
UPDATE public.dispensary_applications
SET registration_token_hash = public.hash_token(registration_token)
WHERE registration_token IS NOT NULL
  AND registration_token_hash IS NULL;

UPDATE public.dispensary_applications
SET registration_token = NULL
WHERE registration_token IS NOT NULL;

-- 4) storage.objects: entitlement-checked read policy for training-videos bucket
DROP POLICY IF EXISTS "Entitled users can read training-videos" ON storage.objects;
CREATE POLICY "Entitled users can read training-videos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'training-videos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.video_assets va
      WHERE va.bucket_id = 'training-videos'
        AND va.storage_path = storage.objects.name
        AND (
          va.access_level = 'public'
          OR EXISTS (
            SELECT 1 FROM public.course_entitlements ce
            WHERE ce.user_id = auth.uid()
              AND ce.course_id = va.course_id
              AND ce.status = 'active'
              AND (ce.expires_at IS NULL OR ce.expires_at > now())
          )
          OR EXISTS (
            SELECT 1 FROM public.rvt_seats rs
            WHERE rs.assigned_user_id = auth.uid()
              AND rs.course_id = va.course_id
              AND rs.status = 'active'
          )
        )
    )
  )
);
