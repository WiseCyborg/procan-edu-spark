
-- 1. video_engagement_events
DROP POLICY IF EXISTS service_role_manage_video_events ON public.video_engagement_events;
CREATE POLICY service_role_manage_video_events
  ON public.video_engagement_events
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. organization_members
DROP POLICY IF EXISTS "Managers view org members" ON public.organization_members;
CREATE POLICY "Managers view org members"
  ON public.organization_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members me
      WHERE me.user_id = auth.uid()
        AND me.organization_id = organization_members.organization_id
        AND me.status = 'active'
        AND me.role IN ('dispensary_manager','training_coordinator','owner','admin')
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 3. password_reset_tokens
ALTER TABLE public.password_reset_tokens ALTER COLUMN token DROP NOT NULL;
ALTER TABLE public.password_reset_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

UPDATE public.password_reset_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.auto_hash_password_reset_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.token IS NOT NULL THEN
    NEW.token_hash := encode(digest(NEW.token, 'sha256'), 'hex');
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hash_password_reset_token_trigger ON public.password_reset_tokens;
CREATE TRIGGER hash_password_reset_token_trigger
  BEFORE INSERT OR UPDATE OF token ON public.password_reset_tokens
  FOR EACH ROW EXECUTE FUNCTION public.auto_hash_password_reset_token();

UPDATE public.password_reset_tokens SET token = NULL WHERE token IS NOT NULL;

ALTER TABLE public.password_reset_tokens
  DROP CONSTRAINT IF EXISTS password_reset_tokens_no_plaintext;
ALTER TABLE public.password_reset_tokens
  ADD CONSTRAINT password_reset_tokens_no_plaintext CHECK (token IS NULL) NOT VALID;
ALTER TABLE public.password_reset_tokens VALIDATE CONSTRAINT password_reset_tokens_no_plaintext;

CREATE INDEX IF NOT EXISTS password_reset_tokens_token_hash_idx
  ON public.password_reset_tokens(token_hash);

DROP POLICY IF EXISTS "Users can view their own reset tokens" ON public.password_reset_tokens;

-- 4. dispensary_applications
UPDATE public.dispensary_applications SET registration_token = NULL WHERE registration_token IS NOT NULL;
ALTER TABLE public.dispensary_applications
  DROP CONSTRAINT IF EXISTS dispensary_applications_registration_token_null;
ALTER TABLE public.dispensary_applications
  ADD CONSTRAINT dispensary_applications_registration_token_null CHECK (registration_token IS NULL) NOT VALID;
ALTER TABLE public.dispensary_applications VALIDATE CONSTRAINT dispensary_applications_registration_token_null;

-- 5. flag_modules_for_regeneration search_path
ALTER FUNCTION public.flag_modules_for_regeneration() SET search_path = public;
