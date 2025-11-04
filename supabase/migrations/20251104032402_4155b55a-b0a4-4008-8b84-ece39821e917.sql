-- Fix SECURITY DEFINER warning on view
DROP VIEW IF EXISTS public.v_paypal_runtime;

CREATE VIEW public.v_paypal_runtime 
WITH (security_invoker = true) AS
SELECT 
  id, 
  environment as env,
  environment as mode,
  updated_at
FROM public.paypal_configuration
ORDER BY updated_at DESC
LIMIT 1;

GRANT SELECT ON public.v_paypal_runtime TO authenticated;