-- Create secure RPC function for allocating additional seats
-- This handles: auth check, validation, transaction safety, audit trail

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
  v_is_authorized boolean;
  v_course_id uuid;
  v_purchase_id uuid;
  v_seat_count integer := 0;
  v_org_name text;
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate quantity
  IF p_seats_to_add < 1 OR p_seats_to_add > 100 THEN
    RAISE EXCEPTION 'Seats must be between 1 and 100';
  END IF;

  -- Check if user is platform admin or org admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = v_user_id 
    AND role IN ('platform_admin', 'system_admin')
  ) INTO v_is_authorized;

  -- If not platform admin, check if org admin
  IF NOT v_is_authorized THEN
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id
      AND role = 'dispensary_manager'
      AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE user_id = v_user_id 
        AND organization_id = p_org_id
      )
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to allocate seats for this organization';
  END IF;

  -- Get org name for response
  SELECT name INTO v_org_name FROM organizations WHERE id = p_org_id;
  
  IF v_org_name IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- Get course ID (RVT course)
  SELECT id INTO v_course_id 
  FROM courses 
  WHERE title ILIKE '%responsible vendor%' 
  AND is_active = true
  LIMIT 1;

  IF v_course_id IS NULL THEN
    RAISE EXCEPTION 'Training course not found';
  END IF;

  -- Create purchase record (audit trail)
  INSERT INTO rvt_purchases (
    organization_id,
    quantity,
    amount_paid,
    payment_method,
    status,
    idempotency_key,
    metadata
  ) VALUES (
    p_org_id,
    p_seats_to_add,
    0,
    'admin_allocated',
    'completed',
    'admin-' || p_org_id || '-' || extract(epoch from now())::text,
    jsonb_build_object(
      'allocated_by', v_user_id,
      'allocated_at', now(),
      'note', COALESCE(p_note, 'Manual admin allocation')
    )
  )
  RETURNING id INTO v_purchase_id;

  -- Create seats
  INSERT INTO rvt_seats (organization_id, course_id, purchase_id, status)
  SELECT p_org_id, v_course_id, v_purchase_id, 'available'
  FROM generate_series(1, p_seats_to_add);

  GET DIAGNOSTICS v_seat_count = ROW_COUNT;

  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'seats_allocated', v_seat_count,
    'purchase_id', v_purchase_id,
    'organization_id', p_org_id,
    'organization_name', v_org_name
  );
END;
$$;

-- Grant execute to authenticated users (RLS in function handles authorization)
GRANT EXECUTE ON FUNCTION public.allocate_additional_seats(uuid, integer, text) TO authenticated;