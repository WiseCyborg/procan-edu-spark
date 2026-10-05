-- A coordinator who passes an owner-allowed join code signs up or signs in
-- in the browser. safe_assign_role is not executable there, and a role row
-- alone does not satisfy the roster check. This function links the signed-in
-- account to that organization as training_coordinator and writes the
-- organization_members row the dashboard requires.
-- It does not send email, consume a seat, or assign any other role.

CREATE OR REPLACE FUNCTION public.complete_coordinator_entry(p_join_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_code text := upper(trim(coalesce(p_join_code, '')));
  v_org uuid;
  v_active boolean;
  v_expires timestamptz;
  v_max integer;
  v_uses integer;
  v_has_seats boolean;
  v_first text;
  v_last text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email,
         NULLIF(raw_user_meta_data->>'first_name', ''),
         NULLIF(raw_user_meta_data->>'last_name', '')
    INTO v_email, v_first, v_last
  FROM auth.users
  WHERE id = v_uid;

  IF v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RAISE EXCEPTION 'Account email is missing';
  END IF;

  IF length(v_code) = 0 THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  SELECT organization_id, is_active, expires_at, max_uses, current_uses
    INTO v_org, v_active, v_expires, v_max, v_uses
  FROM public.rvt_join_codes
  WHERE upper(code) = v_code
  ORDER BY is_active DESC
  LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  IF v_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'owner_not_allowed';
  END IF;

  -- validate-join-code treats a missing expiry as expired.
  IF v_expires IS NULL OR v_expires <= now() THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  IF v_max IS NOT NULL AND COALESCE(v_uses, 0) >= v_max THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  v_has_seats := public.check_seat_availability(
    v_org,
    'e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid
  );
  IF COALESCE(v_has_seats, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'invalid';
  END IF;

  INSERT INTO public.profiles (
    user_id, email_cache, first_name, last_name, organization_id
  ) VALUES (
    v_uid,
    v_email,
    COALESCE(v_first, 'Coordinator'),
    COALESCE(v_last, 'Member'),
    v_org
  )
  ON CONFLICT (user_id) DO UPDATE
  SET organization_id = EXCLUDED.organization_id,
      email_cache = COALESCE(NULLIF(public.profiles.email_cache, ''), EXCLUDED.email_cache),
      updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'training_coordinator')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.organization_members (
    organization_id, user_id, email, role, status, member_type
  ) VALUES (
    v_org, v_uid, v_email, 'training_coordinator', 'active', 'coordinator'
  )
  ON CONFLICT (organization_id, email, role)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    status = 'active',
    member_type = 'coordinator',
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'organization_id', v_org);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_coordinator_entry(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_coordinator_entry(text) TO authenticated;
