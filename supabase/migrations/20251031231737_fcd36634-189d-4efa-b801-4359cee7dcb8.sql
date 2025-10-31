-- Phase 1: Create paypal_configuration table for runtime environment switching
CREATE TABLE IF NOT EXISTS public.paypal_configuration (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK (environment IN ('sandbox', 'production')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with sandbox as default
INSERT INTO public.paypal_configuration (environment)
SELECT 'sandbox'
WHERE NOT EXISTS (SELECT 1 FROM public.paypal_configuration);

-- Enable RLS
ALTER TABLE public.paypal_configuration ENABLE ROW LEVEL SECURITY;

-- Everyone can read the configuration
CREATE POLICY "paypal_config_read_all"
ON public.paypal_configuration FOR SELECT
TO authenticated
USING (true);

-- Only admins can update
CREATE POLICY "paypal_config_update_admins"
ON public.paypal_configuration FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_paypal_config_updated_at ON public.paypal_configuration(updated_at DESC);

-- Add audit logging for PayPal environment changes
COMMENT ON TABLE public.paypal_configuration IS 'Stores active PayPal environment (sandbox/production) for runtime switching without redeployment';