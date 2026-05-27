
-- Migration B: Lock down certificate + join-code tables; add public verification RPCs (S-4, S-5, S-11)

-- ===== user_certificates (S-4) =====
DROP POLICY IF EXISTS "Anyone can verify certificates by code" ON public.user_certificates;
-- Keep "Users can view their own certificates" but tighten to authenticated only
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.user_certificates;
CREATE POLICY "Users can view their own user certificates"
  ON public.user_certificates
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages user certificates"
  ON public.user_certificates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.user_certificates FROM anon;
GRANT SELECT ON public.user_certificates TO authenticated;
GRANT ALL ON public.user_certificates TO service_role;

-- ===== consumer_certificates (S-5) =====
DROP POLICY IF EXISTS "Anyone can verify consumer certificates" ON public.consumer_certificates;
DROP POLICY IF EXISTS "Users can view their own consumer certificates" ON public.consumer_certificates;
CREATE POLICY "Users can view their own consumer certificates"
  ON public.consumer_certificates
  FOR SELECT
  TO authenticated
  USING (
    recipient_email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text)
    OR EXISTS (
      SELECT 1 FROM public.consumer_enrollments ce
      WHERE ce.id = consumer_certificates.enrollment_id
        AND ce.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role manages consumer certificates"
  ON public.consumer_certificates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON public.consumer_certificates FROM anon;
GRANT SELECT ON public.consumer_certificates TO authenticated;
GRANT ALL ON public.consumer_certificates TO service_role;

-- ===== rvt_join_codes (S-11) =====
DROP POLICY IF EXISTS "Anyone can validate join codes" ON public.rvt_join_codes;
-- Keep "Managers can view organization codes" (authenticated, scoped)
-- Keep "Service role can manage join codes"

REVOKE ALL ON public.rvt_join_codes FROM anon;
GRANT SELECT ON public.rvt_join_codes TO authenticated;
GRANT ALL ON public.rvt_join_codes TO service_role;

-- ===== Public verification RPC: consumer certificates =====
CREATE OR REPLACE FUNCTION public.verify_consumer_certificate_public(p_code text)
RETURNS TABLE (
  certificate_number text,
  badge_name text,
  course_title text,
  issue_date timestamptz,
  is_valid boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cc.certificate_number,
    cc.badge_name,
    cc.course_title,
    cc.issue_date,
    true AS is_valid
  FROM public.consumer_certificates cc
  WHERE cc.certificate_number = p_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_consumer_certificate_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_consumer_certificate_public(text) TO anon, authenticated;

-- ===== Public validation RPC: RVT join code (validity only, no org details) =====
CREATE OR REPLACE FUNCTION public.validate_rvt_join_code_public(p_code text)
RETURNS TABLE (
  is_valid boolean,
  has_capacity boolean,
  is_expired boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (jc.is_active AND (jc.expires_at IS NULL OR jc.expires_at > now()) AND (jc.max_uses IS NULL OR jc.current_uses < jc.max_uses)) AS is_valid,
    (jc.max_uses IS NULL OR jc.current_uses < jc.max_uses) AS has_capacity,
    (jc.expires_at IS NOT NULL AND jc.expires_at <= now()) AS is_expired
  FROM public.rvt_join_codes jc
  WHERE jc.code = p_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.validate_rvt_join_code_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_rvt_join_code_public(text) TO anon, authenticated;
