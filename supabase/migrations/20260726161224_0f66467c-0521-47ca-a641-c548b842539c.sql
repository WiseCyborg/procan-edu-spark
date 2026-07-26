-- 1. Security definer view
ALTER VIEW public.certificate_email_failures SET (security_invoker = true);

-- 2. email_analytics: admin read only, writes service-role only
REVOKE INSERT, UPDATE, DELETE ON public.email_analytics FROM authenticated, anon;
REVOKE SELECT ON public.email_analytics FROM anon;
GRANT ALL ON public.email_analytics TO service_role;
DROP POLICY IF EXISTS "Service role manages email analytics" ON public.email_analytics;
CREATE POLICY "Service role manages email analytics"
ON public.email_analytics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. organization_members: invited rows require a verified email
DROP POLICY IF EXISTS "Users view own memberships" ON public.organization_members;
CREATE POLICY "Users view own memberships"
ON public.organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    status = 'invited'
    AND email = auth.email()
    AND coalesce((auth.jwt() -> 'user_metadata' ->> 'email_verified')::boolean, false) = true
  )
);

-- 4. profiles: managers no longer read raw PII from profiles
DROP POLICY IF EXISTS "Org managers view employees in their org" ON public.profiles;
CREATE POLICY "Users and admins view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.org_employee_directory
WITH (security_invoker = false) AS
SELECT
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.email_cache,
  p.organization,
  p.organization_id,
  p.job_title,
  p.job_role,
  p.tier_status,
  p.is_verified,
  p.phone_verified,
  p.profile_photo_url,
  p.welcome_video_watched,
  p.first_shift_date,
  p.training_verified_at,
  p.training_verified_by,
  p.preferred_language,
  p.deleted_at,
  p.deactivated_at,
  p.created_at,
  p.updated_at
FROM public.profiles p
WHERE
  p.user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR (
    p.organization_id IS NOT NULL
    AND p.organization_id = public.get_user_organization_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = ANY (ARRAY['dispensary_manager'::app_role, 'training_coordinator'::app_role])
    )
  );

REVOKE ALL ON public.org_employee_directory FROM anon;
GRANT SELECT ON public.org_employee_directory TO authenticated;
GRANT SELECT ON public.org_employee_directory TO service_role;

-- 5. uat_evidence: membership-based instead of free-text email match
DROP POLICY IF EXISTS "Testers can view and create evidence" ON public.uat_evidence;
DROP POLICY IF EXISTS "Testers can insert their own evidence" ON public.uat_evidence;

CREATE POLICY "Run owners view their evidence"
ON public.uat_evidence FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.uat_runs r
    WHERE r.id = uat_evidence.run_id
      AND r.started_by = auth.uid()
  )
);

CREATE POLICY "Run owners insert their evidence"
ON public.uat_evidence FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.uat_runs r
    WHERE r.id = uat_evidence.run_id
      AND r.started_by = auth.uid()
  )
);