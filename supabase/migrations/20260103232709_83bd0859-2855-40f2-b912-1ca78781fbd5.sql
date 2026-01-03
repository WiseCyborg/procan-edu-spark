
-- Function to fix incomplete dispensary manager registrations
CREATE OR REPLACE FUNCTION public.fix_manager_registration(
  p_user_email TEXT,
  p_application_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_seat_id UUID;
  v_course_id UUID;
  v_result jsonb;
BEGIN
  -- Verify admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admin access required');
  END IF;

  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found: ' || p_user_email);
  END IF;

  -- Get organization ID from application
  SELECT organization_id INTO v_org_id
  FROM dispensary_applications
  WHERE id = p_application_id;

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Application not found or has no organization');
  END IF;

  -- Get active course
  SELECT id INTO v_course_id
  FROM courses
  WHERE is_active = true
  LIMIT 1;

  -- Step 1: Link profile to organization
  UPDATE profiles
  SET organization_id = v_org_id
  WHERE user_id = v_user_id;

  -- Step 2: Ensure dispensary_manager role
  INSERT INTO user_roles (user_id, role)
  VALUES (v_user_id, 'dispensary_manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Step 3: Mark registration complete
  UPDATE dispensary_applications
  SET registration_completed = true
  WHERE id = p_application_id;

  -- Step 4: Assign a seat if not already assigned
  SELECT id INTO v_seat_id
  FROM rvt_seats
  WHERE assigned_user_id = v_user_id
    AND organization_id = v_org_id
  LIMIT 1;

  IF v_seat_id IS NULL THEN
    -- Try to assign an available seat
    UPDATE rvt_seats
    SET 
      assigned_user_id = v_user_id,
      status = 'assigned',
      assigned_at = NOW()
    WHERE organization_id = v_org_id
      AND status = 'available'
      AND assigned_user_id IS NULL
    RETURNING id INTO v_seat_id;

    -- If no available seat, create one
    IF v_seat_id IS NULL AND v_course_id IS NOT NULL THEN
      INSERT INTO rvt_seats (organization_id, course_id, assigned_user_id, status, assigned_at)
      VALUES (v_org_id, v_course_id, v_user_id, 'assigned', NOW())
      RETURNING id INTO v_seat_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'organization_id', v_org_id,
    'seat_id', v_seat_id,
    'message', 'Registration fixed: profile linked, role assigned, seat allocated'
  );
END;
$$;

-- Grant execute to authenticated users (RLS within function checks admin)
GRANT EXECUTE ON FUNCTION public.fix_manager_registration TO authenticated;
