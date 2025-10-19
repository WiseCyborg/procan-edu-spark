-- Phase 1: Create RVT Purchases, Seats, and Audit Tables

-- Create rvt_purchases table
CREATE TABLE IF NOT EXISTS public.rvt_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  amount_paid NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_method TEXT NOT NULL DEFAULT 'paypal',
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  paypal_payer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  idempotency_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create rvt_seats table
CREATE TABLE IF NOT EXISTS public.rvt_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID REFERENCES public.rvt_purchases(id) ON DELETE CASCADE NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  assigned_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'used', 'expired')),
  assigned_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create payment_audit_log table
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rvt_purchases_org ON public.rvt_purchases(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rvt_purchases_status ON public.rvt_purchases(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rvt_purchases_paypal ON public.rvt_purchases(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_rvt_seats_org ON public.rvt_seats(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_rvt_seats_user ON public.rvt_seats(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_order ON public.payment_audit_log(order_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.rvt_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rvt_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rvt_purchases
CREATE POLICY "Managers can view their org purchases"
  ON public.rvt_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid()
        AND p.organization_id = rvt_purchases.organization_id
        AND ur.role IN ('dispensary_manager', 'training_coordinator')
    )
  );

CREATE POLICY "Admins can view all purchases"
  ON public.rvt_purchases FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage purchases"
  ON public.rvt_purchases FOR ALL
  USING (current_setting('role') = 'service_role');

-- RLS Policies for rvt_seats
CREATE POLICY "Managers can view their org seats"
  ON public.rvt_seats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
      WHERE p.user_id = auth.uid()
        AND p.organization_id = rvt_seats.organization_id
        AND ur.role IN ('dispensary_manager', 'training_coordinator')
    )
  );

CREATE POLICY "Users can view their assigned seats"
  ON public.rvt_seats FOR SELECT
  USING (assigned_user_id = auth.uid());

CREATE POLICY "Admins can view all seats"
  ON public.rvt_seats FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage seats"
  ON public.rvt_seats FOR ALL
  USING (current_setting('role') = 'service_role');

-- RLS Policies for payment_audit_log
CREATE POLICY "Admins can view audit logs"
  ON public.payment_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert audit logs"
  ON public.payment_audit_log FOR INSERT
  WITH CHECK (current_setting('role') = 'service_role');

-- Database Function: Get organization seat status
CREATE OR REPLACE FUNCTION public.get_organization_seat_status(org_id UUID)
RETURNS TABLE(
  total_purchased INTEGER,
  available INTEGER,
  assigned INTEGER,
  used INTEGER,
  utilization_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_purchased,
    COUNT(*) FILTER (WHERE status = 'available')::INTEGER as available,
    COUNT(*) FILTER (WHERE status = 'assigned')::INTEGER as assigned,
    COUNT(*) FILTER (WHERE status = 'used')::INTEGER as used,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE status IN ('assigned', 'used'))::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END as utilization_percentage
  FROM public.rvt_seats
  WHERE organization_id = org_id;
END;
$$;

-- Database Function: Allocate seat to user
CREATE OR REPLACE FUNCTION public.allocate_seat_to_user(
  org_id UUID,
  user_id UUID,
  course_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seat_id UUID;
BEGIN
  -- Find an available seat and assign it atomically
  UPDATE public.rvt_seats
  SET 
    assigned_user_id = user_id,
    status = 'assigned',
    assigned_at = NOW()
  WHERE id = (
    SELECT id FROM public.rvt_seats
    WHERE organization_id = org_id
      AND course_id = course_id
      AND status = 'available'
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO seat_id;

  IF seat_id IS NULL THEN
    RAISE EXCEPTION 'No available seats for this organization';
  END IF;

  RETURN seat_id;
END;
$$;

-- Database Function: Check seat availability
CREATE OR REPLACE FUNCTION public.check_seat_availability(
  org_id UUID,
  course_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.rvt_seats
    WHERE organization_id = org_id
      AND course_id = course_id
      AND status = 'available'
  );
END;
$$;