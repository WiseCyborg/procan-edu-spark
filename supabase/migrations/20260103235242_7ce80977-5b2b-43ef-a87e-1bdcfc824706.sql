
DO $$
DECLARE
  v_user_id uuid;
  v_org_id uuid;
  v_seat_id uuid;
BEGIN
  -- Get Danielle's user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'daniellebrooks502@gmail.com';
  
  -- Get ABC's organization ID
  SELECT id INTO v_org_id FROM public.organizations WHERE name = 'ABC';
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  -- 1. Update profile to link to ABC
  UPDATE public.profiles 
  SET organization_id = v_org_id
  WHERE id = v_user_id;

  -- 2. Add dispensary_manager role (if not exists)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'dispensary_manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- 3. Allocate a seat (using correct column name: assigned_user_id)
  UPDATE public.rvt_seats
  SET assigned_user_id = v_user_id, status = 'assigned', assigned_at = now()
  WHERE id = (
    SELECT id FROM public.rvt_seats 
    WHERE organization_id = v_org_id AND status = 'available' 
    LIMIT 1
  )
  RETURNING id INTO v_seat_id;

  -- 4. Mark registration completed on the application
  UPDATE public.dispensary_applications
  SET registration_completed = true
  WHERE organization_id = v_org_id;

  RAISE NOTICE 'Fixed: user=%, org=%, seat=%', v_user_id, v_org_id, v_seat_id;
END $$;
