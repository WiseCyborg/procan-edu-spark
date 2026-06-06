
-- 1) Certificate generation error log
CREATE TABLE IF NOT EXISTS public.certificate_generation_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NULL,
  user_id uuid NULL,
  course_id uuid NULL,
  exam_attempt_id uuid NULL,
  source text NOT NULL,
  attempt_number integer NOT NULL DEFAULT 1,
  error_message text NOT NULL,
  error_detail jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.certificate_generation_errors TO authenticated;
GRANT ALL ON public.certificate_generation_errors TO service_role;

ALTER TABLE public.certificate_generation_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read certificate generation errors"
ON public.certificate_generation_errors
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages certificate generation errors"
ON public.certificate_generation_errors
FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cert_gen_errors_user_created
  ON public.certificate_generation_errors (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_gen_errors_created
  ON public.certificate_generation_errors (created_at DESC);

-- 2) Audit log composite indexes
CREATE INDEX IF NOT EXISTS idx_admin_ops_audit_target_created
  ON public.admin_operations_audit (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_security_audit_user_created
  ON public.security_audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cert_audit_action_created
  ON public.certificate_audit_log (action, created_at DESC);
