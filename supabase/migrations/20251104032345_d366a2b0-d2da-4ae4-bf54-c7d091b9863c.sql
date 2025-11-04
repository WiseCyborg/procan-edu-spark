-- ==========================================
-- Security Hardening Phase 1: PayPal Config
-- ==========================================

-- Lock down PayPal configuration table
ALTER TABLE IF EXISTS public.paypal_configuration ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paypal_config_read_all" ON public.paypal_configuration;
DROP POLICY IF EXISTS "paypal_config_update_admins" ON public.paypal_configuration;

-- Admin full access
CREATE POLICY "p_paypal_config_admin_all"
  ON public.paypal_configuration FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role)) 
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role full access
CREATE POLICY "p_paypal_config_service_all"
  ON public.paypal_configuration FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Minimal client-facing view (no secrets)
CREATE OR REPLACE VIEW public.v_paypal_runtime AS
SELECT 
  id, 
  environment as env,
  environment as mode,
  updated_at
FROM public.paypal_configuration
ORDER BY updated_at DESC
LIMIT 1;

-- Grant SELECT on view to authenticated users
GRANT SELECT ON public.v_paypal_runtime TO authenticated;

-- Comment for documentation
COMMENT ON VIEW public.v_paypal_runtime IS 
  'Client-safe PayPal runtime config - excludes sensitive fields';