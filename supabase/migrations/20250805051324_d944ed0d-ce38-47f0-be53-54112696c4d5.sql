-- Create payments table for Stripe integration
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  stripe_session_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'pending', -- pending, paid, failed, canceled
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" 
ON public.orders 
FOR ALL 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add course pricing to courses table
ALTER TABLE public.courses 
ADD COLUMN price_cents INTEGER DEFAULT 4999, -- $49.99 default
ADD COLUMN currency TEXT DEFAULT 'usd',
ADD COLUMN payment_required BOOLEAN DEFAULT true;

-- Update existing courses with default pricing
UPDATE public.courses 
SET price_cents = 4999, currency = 'usd', payment_required = true
WHERE price_cents IS NULL;