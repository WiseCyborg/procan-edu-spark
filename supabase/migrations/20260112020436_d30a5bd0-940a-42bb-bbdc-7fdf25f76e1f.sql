-- =====================================================
-- PRICING + ENTITLEMENTS SYSTEM
-- =====================================================

-- 1. Add Stripe columns to courses if not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'stripe_product_id') THEN
    ALTER TABLE public.courses ADD COLUMN stripe_product_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'stripe_price_id') THEN
    ALTER TABLE public.courses ADD COLUMN stripe_price_id text;
  END IF;
END $$;

-- 2. Update course prices
UPDATE public.courses SET price_cents = 4999, currency = 'USD', payment_required = true WHERE id = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'; -- RVT
UPDATE public.courses SET price_cents = 1999, currency = 'USD', payment_required = true WHERE id = 'fd6dc848-89a5-498e-a9e9-9647228fb532'; -- First Time
UPDATE public.courses SET price_cents = 1499, currency = 'USD', payment_required = false WHERE id = 'c1ba4f7f-1e62-407d-b463-7e57e8f15520'; -- Cannabis 101 (free for consumers)
UPDATE public.courses SET price_cents = 1499, currency = 'USD', payment_required = false WHERE id = '6839959e-40ea-4398-8fe6-682293e1f96a'; -- MD Laws (free for consumers)
UPDATE public.courses SET price_cents = 7999, currency = 'USD', payment_required = true WHERE id = '11111111-1111-4111-a111-111111111111'; -- Manager
UPDATE public.courses SET price_cents = 9999, currency = 'USD', payment_required = true WHERE id = '22222222-2222-4222-a222-222222222222'; -- Ganjier
UPDATE public.courses SET price_cents = 9999, currency = 'USD', payment_required = true WHERE id = '33333333-3333-4333-a333-333333333333'; -- Sommelier

-- 3. Create course_entitlements table (access truth)
CREATE TABLE IF NOT EXISTS public.course_entitlements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'stripe' CHECK (source IN ('stripe', 'org_seat', 'admin_grant', 'promo_code')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  granted_by uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- Enable RLS
ALTER TABLE public.course_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own entitlements"
  ON public.course_entitlements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage entitlements"
  ON public.course_entitlements FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- 4. Update get_access_snapshot to check entitlements
CREATE OR REPLACE FUNCTION public.get_access_snapshot(p_course_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_course record;
  v_has_entitlement boolean := false;
  v_prereq_completed boolean := true;
  v_deny_reason text;
BEGIN
  v_user_id := auth.uid();
  
  -- If no course specified, use RVT core
  IF p_course_id IS NULL THEN
    p_course_id := 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid;
  END IF;
  
  -- Get course info
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  
  IF v_course IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'course_not_found',
      'course_id', p_course_id
    );
  END IF;
  
  -- Public consumer courses don't require auth or payment
  IF v_course.course_type = 'consumer' AND v_course.is_public = true AND v_course.payment_required = false THEN
    RETURN jsonb_build_object(
      'can_access', true,
      'deny_reason', null,
      'course_id', p_course_id,
      'is_public', true
    );
  END IF;
  
  -- Anonymous users need to login for paid/professional courses
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'auth_required',
      'course_id', p_course_id
    );
  END IF;
  
  -- Check prerequisite if required
  IF v_course.prerequisite_course_id IS NOT NULL AND v_course.prerequisite_required = true THEN
    SELECT EXISTS (
      SELECT 1 FROM course_completions 
      WHERE user_id = v_user_id AND course_id = v_course.prerequisite_course_id AND passed = true
    ) OR EXISTS (
      SELECT 1 FROM certificates 
      WHERE user_id = v_user_id AND course_id = v_course.prerequisite_course_id AND is_revoked = false
    ) INTO v_prereq_completed;
    
    IF NOT v_prereq_completed THEN
      RETURN jsonb_build_object(
        'can_access', false,
        'deny_reason', 'prerequisite_required',
        'course_id', p_course_id,
        'prerequisite_course_id', v_course.prerequisite_course_id
      );
    END IF;
  END IF;
  
  -- Check entitlement for paid courses
  IF v_course.payment_required = true THEN
    SELECT EXISTS (
      SELECT 1 FROM course_entitlements 
      WHERE user_id = v_user_id 
        AND course_id = p_course_id 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_has_entitlement;
    
    -- Also check org_memberships for org-paid seats
    IF NOT v_has_entitlement THEN
      SELECT EXISTS (
        SELECT 1 FROM org_memberships om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = v_user_id 
          AND om.seat_type = 'training_seat'
          AND om.is_active = true
      ) INTO v_has_entitlement;
    END IF;
    
    IF NOT v_has_entitlement THEN
      RETURN jsonb_build_object(
        'can_access', false,
        'deny_reason', 'payment_required',
        'course_id', p_course_id,
        'price_cents', v_course.price_cents,
        'currency', v_course.currency
      );
    END IF;
  END IF;
  
  -- All checks passed
  RETURN jsonb_build_object(
    'can_access', true,
    'deny_reason', null,
    'course_id', p_course_id,
    'has_entitlement', v_has_entitlement
  );
END;
$$;

-- 5. Update get_course_launch_target to use entitlements
CREATE OR REPLACE FUNCTION public.get_course_launch_target(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_course record;
  v_access jsonb;
  v_cta_label text := 'start';
  v_has_certificate boolean := false;
  v_start_target jsonb;
  v_first_module record;
  v_resume_state record;
BEGIN
  v_user_id := auth.uid();
  
  -- Get course info
  SELECT * INTO v_course FROM courses WHERE id = p_course_id AND is_active = true;
  
  IF v_course IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'course_not_found',
      'cta_label', 'unavailable',
      'has_certificate', false,
      'start_target', null
    );
  END IF;
  
  -- Check if course has any published modules
  IF NOT EXISTS (SELECT 1 FROM course_modules WHERE course_id = p_course_id AND is_active = true) THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'course_not_published',
      'cta_label', 'coming_soon',
      'has_certificate', false,
      'start_target', null
    );
  END IF;
  
  -- Get first module
  SELECT id, module_number INTO v_first_module 
  FROM course_modules 
  WHERE course_id = p_course_id AND is_active = true 
  ORDER BY module_number 
  LIMIT 1;
  
  -- Check access using get_access_snapshot
  v_access := get_access_snapshot(p_course_id);
  
  -- For consumer public courses, allow without auth
  IF v_course.course_type = 'consumer' AND v_course.is_public = true AND v_course.payment_required = false THEN
    v_start_target := jsonb_build_object(
      'type', 'module_overview',
      'module_id', v_first_module.id,
      'module_number', v_first_module.module_number,
      'route', '/consumer-education/' || p_course_id::text
    );
    
    RETURN jsonb_build_object(
      'can_access', true,
      'deny_reason', null,
      'cta_label', 'start',
      'has_certificate', false,
      'start_target', v_start_target,
      'course_type', v_course.course_type,
      'price_cents', v_course.price_cents
    );
  END IF;
  
  -- Return access denied with proper reason
  IF NOT (v_access->>'can_access')::boolean THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', v_access->>'deny_reason',
      'cta_label', CASE 
        WHEN v_access->>'deny_reason' = 'payment_required' THEN 'purchase'
        WHEN v_access->>'deny_reason' = 'prerequisite_required' THEN 'locked'
        WHEN v_access->>'deny_reason' = 'auth_required' THEN 'login'
        ELSE 'unavailable'
      END,
      'has_certificate', false,
      'start_target', null,
      'price_cents', v_course.price_cents,
      'course_type', v_course.course_type
    );
  END IF;
  
  -- Check for existing certificate
  SELECT EXISTS (
    SELECT 1 FROM user_certificates 
    WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'issued'
  ) OR EXISTS (
    SELECT 1 FROM certificates 
    WHERE user_id = v_user_id AND course_id = p_course_id AND is_revoked = false
  ) INTO v_has_certificate;
  
  IF v_has_certificate THEN
    v_cta_label := 'view_certificate';
  ELSE
    -- Check for resume state
    SELECT * INTO v_resume_state 
    FROM course_resume_state 
    WHERE user_id = v_user_id AND course_id = p_course_id
    ORDER BY last_activity_at DESC
    LIMIT 1;
    
    IF v_resume_state IS NOT NULL AND v_resume_state.module_number > 1 THEN
      v_cta_label := 'continue';
    ELSE
      v_cta_label := 'start';
    END IF;
  END IF;
  
  -- Build start target
  IF v_resume_state IS NOT NULL THEN
    v_start_target := jsonb_build_object(
      'type', 'module_page',
      'module_id', v_resume_state.module_id,
      'module_number', v_resume_state.module_number,
      'page_index', v_resume_state.last_page_index,
      'route', '/course/part' || v_resume_state.module_number::text
    );
  ELSE
    v_start_target := jsonb_build_object(
      'type', 'module_overview',
      'module_id', v_first_module.id,
      'module_number', v_first_module.module_number,
      'route', '/course/part1'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_access', true,
    'deny_reason', null,
    'cta_label', v_cta_label,
    'has_certificate', v_has_certificate,
    'start_target', v_start_target,
    'course_type', v_course.course_type,
    'price_cents', v_course.price_cents
  );
END;
$$;