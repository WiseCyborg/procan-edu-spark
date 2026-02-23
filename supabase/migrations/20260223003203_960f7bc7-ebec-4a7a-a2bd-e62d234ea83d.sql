
-- Create unified audit timeline view (4 user-linkable audit tables)
CREATE OR REPLACE VIEW public.unified_audit_timeline AS
WITH unified AS (
  -- Certificate events
  SELECT
    cal.id::text AS event_id,
    cal.actor_id AS user_id,
    'certificate' AS audit_source,
    cal.action AS event_type,
    cal.metadata AS event_data,
    cal.created_at
  FROM public.certificate_audit_log cal

  UNION ALL

  -- Security events
  SELECT
    sal.id::text AS event_id,
    sal.user_id,
    'security' AS audit_source,
    sal.action_type AS event_type,
    jsonb_build_object(
      'table_name', sal.table_name,
      'record_id', sal.record_id,
      'old_values', sal.old_values,
      'new_values', sal.new_values
    ) AS event_data,
    sal.created_at
  FROM public.security_audit_log sal

  UNION ALL

  -- Admin operations
  SELECT
    aoa.id::text AS event_id,
    COALESCE(aoa.target_user_id, aoa.performed_by) AS user_id,
    'admin_ops' AS audit_source,
    aoa.operation_type AS event_type,
    jsonb_build_object(
      'performed_by', aoa.performed_by,
      'target_user_id', aoa.target_user_id,
      'target_email', aoa.target_email,
      'success', aoa.success
    ) AS event_data,
    aoa.created_at
  FROM public.admin_operations_audit aoa

  UNION ALL

  -- API console
  SELECT
    aca.id::text AS event_id,
    aca.user_id,
    'api_console' AS audit_source,
    aca.command AS event_type,
    jsonb_build_object(
      'api_route', aca.api_route,
      'success', aca.success,
      'error_message', aca.error_message
    ) AS event_data,
    aca.created_at
  FROM public.api_console_audit aca
)
SELECT event_id, user_id, audit_source, event_type, event_data, created_at
FROM unified;

-- Payment audit helper view (best-effort user extraction from JSON)
CREATE OR REPLACE VIEW public.payment_audit_user_hint AS
SELECT
  id,
  order_id,
  event_type,
  created_at,
  (event_data->>'user_id')::uuid AS extracted_user_id,
  (event_data->>'email') AS extracted_email,
  event_data
FROM public.payment_audit_log;

-- RLS on base audit tables for admin-only access
-- certificate_audit_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'certificate_audit_log' AND policyname = 'Admins can read certificate audit'
  ) THEN
    CREATE POLICY "Admins can read certificate audit"
    ON public.certificate_audit_log FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- security_audit_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'security_audit_log' AND policyname = 'Admins can read security audit'
  ) THEN
    CREATE POLICY "Admins can read security audit"
    ON public.security_audit_log FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- admin_operations_audit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'admin_operations_audit' AND policyname = 'Admins can read admin ops audit'
  ) THEN
    CREATE POLICY "Admins can read admin ops audit"
    ON public.admin_operations_audit FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- api_console_audit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'api_console_audit' AND policyname = 'Admins can read api console audit'
  ) THEN
    CREATE POLICY "Admins can read api console audit"
    ON public.api_console_audit FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- payment_audit_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'payment_audit_log' AND policyname = 'Admins can read payment audit'
  ) THEN
    CREATE POLICY "Admins can read payment audit"
    ON public.payment_audit_log FOR SELECT TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
