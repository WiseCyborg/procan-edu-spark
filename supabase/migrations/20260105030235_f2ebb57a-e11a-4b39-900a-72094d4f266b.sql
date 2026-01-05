-- Fix: Update allocate_additional_seats to use 'admin' instead of 'platform_admin'
CREATE OR REPLACE FUNCTION public.allocate_additional_seats(
  p_org_id uuid,
  p_seats_to_add integer,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_authorized boolean := false;
  v_course_id uuid;
  v_purchase_id uuid;
  v_seats_created integer := 0;
BEGIN
  -- Check authentication
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate quantity
  IF p_seats_to_add < 1 OR p_seats_to_add > 100 THEN
    RAISE EXCEPTION 'Seats must be between 1 and 100';
  END IF;

  -- Check if user is platform admin (has 'admin' role)
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = v_user_id
      AND role = 'admin'
  ) INTO v_is_authorized;

  -- If not platform admin, check if org admin/owner
  IF NOT v_is_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_id = p_org_id
        AND user_id = v_user_id
        AND role IN ('owner', 'admin')
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to allocate seats';
  END IF;

  -- Get the RVT course ID
  SELECT id INTO v_course_id
  FROM courses
  WHERE title ILIKE '%Maryland Responsible Vendor%'
    OR title ILIKE '%RVT%'
  LIMIT 1;

  IF v_course_id IS NULL THEN
    -- Use the first active course as fallback
    SELECT id INTO v_course_id FROM courses WHERE is_active = true LIMIT 1;
  END IF;

  -- Create purchase record for audit trail
  INSERT INTO rvt_purchases (
    organization_id,
    quantity,
    unit_price_cents,
    total_price_cents,
    payment_status,
    payment_provider,
    notes
  ) VALUES (
    p_org_id,
    p_seats_to_add,
    0, -- Admin allocation, no charge
    0,
    'completed',
    'admin_allocation',
    COALESCE(p_note, 'Admin seat allocation by ' || v_user_id::text)
  )
  RETURNING id INTO v_purchase_id;

  -- Create the seat records
  FOR i IN 1..p_seats_to_add LOOP
    INSERT INTO rvt_seats (
      organization_id,
      course_id,
      purchase_id,
      status
    ) VALUES (
      p_org_id,
      v_course_id,
      v_purchase_id,
      'available'
    );
    v_seats_created := v_seats_created + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'seats_created', v_seats_created,
    'purchase_id', v_purchase_id,
    'organization_id', p_org_id
  );
END;
$$;