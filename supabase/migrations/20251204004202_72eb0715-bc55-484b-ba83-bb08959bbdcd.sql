-- Phase 2: Tiered Seat Licensing Database Schema

-- 1. Create subscription_tiers reference table
CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  max_active_seats INTEGER NOT NULL,
  rotational_buffer INTEGER NOT NULL,
  annual_price_cents INTEGER NOT NULL,
  display_order INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default tiers
INSERT INTO public.subscription_tiers (tier_name, display_name, max_active_seats, rotational_buffer, annual_price_cents, display_order, features) VALUES
('starter', 'Starter', 35, 15, 350000, 1, '["Basic reporting", "Email support", "Standard SLA", "Up to 35 active learners"]'::jsonb),
('professional', 'Professional', 60, 25, 550000, 2, '["Advanced analytics", "Priority support", "Custom branding", "Up to 60 active learners"]'::jsonb),
('enterprise', 'Enterprise', 100, 40, 850000, 3, '["Dedicated success manager", "API access", "Custom integrations", "Up to 100 active learners"]'::jsonb),
('unlimited', 'Unlimited', 999999, 999999, 1200000, 4, '["Everything in Enterprise", "Unlimited seats", "White-label option", "Custom SLA"]'::jsonb)
ON CONFLICT (tier_name) DO NOTHING;

-- 2. Add subscription columns to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS max_active_seats INTEGER DEFAULT 35,
ADD COLUMN IF NOT EXISTS rotational_buffer INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS is_rotational_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS annual_price_cents INTEGER DEFAULT 350000,
ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'standard';

-- 3. Create seat_rotation_history table for audit trail
CREATE TABLE IF NOT EXISTS public.seat_rotation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  seat_id UUID REFERENCES public.rvt_seats(id) ON DELETE SET NULL,
  previous_user_id UUID,
  new_user_id UUID,
  action_type TEXT NOT NULL CHECK (action_type IN ('assigned', 'archived', 'rotated', 'expired', 'reactivated')),
  performed_by UUID,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create subscription_history table for billing audit
CREATE TABLE IF NOT EXISTS public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  previous_tier TEXT,
  new_tier TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('upgrade', 'downgrade', 'renewal', 'new', 'cancel')),
  amount_cents INTEGER,
  proration_amount_cents INTEGER DEFAULT 0,
  payment_method TEXT,
  payment_reference TEXT,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Enable RLS on new tables
ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_rotation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- 6. RLS policies for subscription_tiers (public read)
CREATE POLICY "Anyone can view subscription tiers" ON public.subscription_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage subscription tiers" ON public.subscription_tiers
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. RLS policies for seat_rotation_history
CREATE POLICY "Organization managers can view rotation history" ON public.seat_rotation_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND (ur.role IN ('dispensary_manager', 'training_coordinator', 'admin'))
    AND (p.organization_id = seat_rotation_history.organization_id OR ur.role = 'admin')
  )
);

CREATE POLICY "Service role manages rotation history" ON public.seat_rotation_history
FOR ALL USING (current_setting('role'::text) = 'service_role');

-- 8. RLS policies for subscription_history
CREATE POLICY "Organization managers can view subscription history" ON public.subscription_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND (ur.role IN ('dispensary_manager', 'admin'))
    AND (p.organization_id = subscription_history.organization_id OR ur.role = 'admin')
  )
);

CREATE POLICY "Admins can manage subscription history" ON public.subscription_history
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Create check_seat_capacity function
CREATE OR REPLACE FUNCTION public.check_seat_capacity(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  active_count INTEGER;
  archived_count INTEGER;
  result JSONB;
BEGIN
  -- Get organization subscription details
  SELECT subscription_tier, max_active_seats, rotational_buffer, is_rotational_enabled
  INTO org_record
  FROM organizations
  WHERE id = org_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Organization not found', 'canAdd', false);
  END IF;
  
  -- Count active seats (assigned status)
  SELECT COUNT(*) INTO active_count
  FROM rvt_seats
  WHERE organization_id = org_id AND status IN ('assigned', 'used');
  
  -- Count archived seats
  SELECT COUNT(*) INTO archived_count
  FROM rvt_seats
  WHERE organization_id = org_id AND status = 'archived';
  
  result := jsonb_build_object(
    'canAdd', active_count < org_record.max_active_seats,
    'activeSeats', active_count,
    'maxSeats', org_record.max_active_seats,
    'archivedSeats', archived_count,
    'rotationalBuffer', org_record.rotational_buffer,
    'remainingActive', org_record.max_active_seats - active_count,
    'remainingBuffer', org_record.rotational_buffer - archived_count,
    'tier', org_record.subscription_tier,
    'isRotationalEnabled', org_record.is_rotational_enabled
  );
  
  IF active_count >= org_record.max_active_seats THEN
    result := result || jsonb_build_object('message', 'Organization has reached maximum active seat limit. Please upgrade your tier or archive inactive users.');
  END IF;
  
  RETURN result;
END;
$$;

-- 10. Create archive_user_seat function
CREATE OR REPLACE FUNCTION public.archive_user_seat(
  p_user_id UUID,
  p_reason TEXT DEFAULT 'Employee rotated out',
  p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seat_record RECORD;
  org_id UUID;
  archived_count INTEGER;
  rotational_buffer INTEGER;
BEGIN
  -- Find the user's active seat
  SELECT s.id, s.organization_id, s.status, o.rotational_buffer
  INTO seat_record
  FROM rvt_seats s
  JOIN organizations o ON o.id = s.organization_id
  WHERE s.assigned_user_id = p_user_id AND s.status IN ('assigned', 'used')
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active seat found for this user');
  END IF;
  
  org_id := seat_record.organization_id;
  rotational_buffer := seat_record.rotational_buffer;
  
  -- Check rotational buffer limit
  SELECT COUNT(*) INTO archived_count
  FROM rvt_seats
  WHERE organization_id = org_id AND status = 'archived';
  
  IF archived_count >= rotational_buffer THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Rotational buffer limit reached. Upgrade tier to archive more users.',
      'archivedCount', archived_count,
      'bufferLimit', rotational_buffer
    );
  END IF;
  
  -- Update seat to archived status
  UPDATE rvt_seats
  SET status = 'archived',
      assigned_user_id = NULL,
      updated_at = now()
  WHERE id = seat_record.id;
  
  -- Log rotation history
  INSERT INTO seat_rotation_history (
    organization_id, seat_id, previous_user_id, action_type, performed_by, reason
  ) VALUES (
    org_id, seat_record.id, p_user_id, 'archived', p_performed_by, p_reason
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User seat archived successfully',
    'seatId', seat_record.id,
    'freedCapacity', 1
  );
END;
$$;

-- 11. Create get_organization_subscription_status function
CREATE OR REPLACE FUNCTION public.get_organization_subscription_status(org_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  tier_record RECORD;
  active_count INTEGER;
  archived_count INTEGER;
  days_remaining INTEGER;
  result JSONB;
BEGIN
  SELECT * INTO org_record
  FROM organizations
  WHERE id = org_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Organization not found');
  END IF;
  
  SELECT * INTO tier_record
  FROM subscription_tiers
  WHERE tier_name = org_record.subscription_tier;
  
  SELECT COUNT(*) INTO active_count
  FROM rvt_seats
  WHERE organization_id = org_id AND status IN ('assigned', 'used');
  
  SELECT COUNT(*) INTO archived_count
  FROM rvt_seats
  WHERE organization_id = org_id AND status = 'archived';
  
  IF org_record.subscription_end_date IS NOT NULL THEN
    days_remaining := EXTRACT(DAY FROM org_record.subscription_end_date - now())::INTEGER;
  ELSE
    days_remaining := NULL;
  END IF;
  
  RETURN jsonb_build_object(
    'organizationId', org_id,
    'organizationName', org_record.name,
    'tier', jsonb_build_object(
      'name', org_record.subscription_tier,
      'displayName', tier_record.display_name,
      'maxActiveSeats', org_record.max_active_seats,
      'rotationalBuffer', org_record.rotational_buffer,
      'annualPriceCents', org_record.annual_price_cents,
      'features', tier_record.features
    ),
    'usage', jsonb_build_object(
      'activeSeats', active_count,
      'archivedSeats', archived_count,
      'remainingActive', org_record.max_active_seats - active_count,
      'remainingBuffer', org_record.rotational_buffer - archived_count,
      'utilizationPercent', ROUND((active_count::NUMERIC / NULLIF(org_record.max_active_seats, 0)) * 100, 1)
    ),
    'subscription', jsonb_build_object(
      'startDate', org_record.subscription_start_date,
      'endDate', org_record.subscription_end_date,
      'daysRemaining', days_remaining,
      'pricingType', org_record.pricing_type,
      'isRotationalEnabled', org_record.is_rotational_enabled
    )
  );
END;
$$;

-- 12. Create upgrade_subscription_tier function
CREATE OR REPLACE FUNCTION public.upgrade_subscription_tier(
  org_id UUID,
  new_tier_name TEXT,
  payment_ref TEXT DEFAULT NULL,
  performed_by_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_record RECORD;
  new_tier RECORD;
  old_tier TEXT;
  proration_cents INTEGER;
  days_remaining INTEGER;
BEGIN
  SELECT * INTO org_record FROM organizations WHERE id = org_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;
  
  SELECT * INTO new_tier FROM subscription_tiers WHERE tier_name = new_tier_name AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid tier');
  END IF;
  
  old_tier := org_record.subscription_tier;
  
  -- Calculate proration if mid-cycle
  IF org_record.subscription_end_date IS NOT NULL THEN
    days_remaining := GREATEST(0, EXTRACT(DAY FROM org_record.subscription_end_date - now())::INTEGER);
    proration_cents := ((new_tier.annual_price_cents - COALESCE(org_record.annual_price_cents, 0)) * days_remaining) / 365;
  ELSE
    proration_cents := 0;
    days_remaining := 365;
  END IF;
  
  -- Update organization tier
  UPDATE organizations SET
    subscription_tier = new_tier_name,
    max_active_seats = new_tier.max_active_seats,
    rotational_buffer = new_tier.rotational_buffer,
    annual_price_cents = new_tier.annual_price_cents,
    subscription_start_date = COALESCE(subscription_start_date, now()),
    subscription_end_date = COALESCE(subscription_end_date, now() + INTERVAL '1 year'),
    updated_at = now()
  WHERE id = org_id;
  
  -- Log subscription change
  INSERT INTO subscription_history (
    organization_id, previous_tier, new_tier, action_type, 
    amount_cents, proration_amount_cents, payment_reference, performed_by
  ) VALUES (
    org_id, old_tier, new_tier_name, 'upgrade',
    new_tier.annual_price_cents, proration_cents, payment_ref, performed_by_id
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'previousTier', old_tier,
    'newTier', new_tier_name,
    'prorationCents', proration_cents,
    'newMaxSeats', new_tier.max_active_seats,
    'newBuffer', new_tier.rotational_buffer
  );
END;
$$;