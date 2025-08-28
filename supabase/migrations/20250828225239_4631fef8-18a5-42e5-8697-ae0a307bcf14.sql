-- Add PayPal-specific columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_payment_id TEXT;

-- Update organizations table to include PayPal payment tracking
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS paypal_order_id TEXT,
ADD COLUMN IF NOT EXISTS paypal_payer_id TEXT;

-- Update default payment method in payments table to reflect PayPal usage
ALTER TABLE public.payments 
ALTER COLUMN payment_method SET DEFAULT 'paypal';

-- Create index for PayPal order lookups
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON public.orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_organizations_paypal_order_id ON public.organizations(paypal_order_id);