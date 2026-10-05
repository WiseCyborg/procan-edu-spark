-- Browser registration cannot call safe_assign_role (execute is limited to
-- service_role) and cannot update dispensary_applications under RLS.
-- This function assigns only the dispensary_manager role, and only when the
-- signed-in email matches an approved application or an active join code.

CREATE OR REPLACE FUNCTION public.complete_manager_registration(
  p_application_id uuid DEFAULT NULL,
  p_join_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_app public.dispensary_applications%ROWTYPE;
  v_org uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Account email is missing';
  END IF;

  IF p_application_id IS NOT NULL THEN
    SELECT * INTO v_app
    FROM public.dispensary_applications
    WHERE id = p_application_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Application not found';
    END IF;
    IF v_app.application_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Application is not approved';
    END IF;
    IF COALESCE(v_app.registration_completed, false) THEN
      RAISE EXCEPTION 'Registration already completed';
    END IF;
    IF lower(v_app.contact_email) IS DISTINCT FROM lower(v_email) THEN
      RAISE EXCEPTION 'Email does not match this registration';
    END IF;
    IF v_app.organization_id IS NULL THEN
      RAISE EXCEPTION 'Organization is not linked';
    END IF;

    v_org := v_app.organization_id;
  ELSIF p_join_code IS NOT NULL AND length(trim(p_join_code)) > 0 THEN
    SELECT organization_id INTO v_org
    FROM public.rvt_join_codes
    WHERE upper(code) = upper(trim(p_join_code))
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());

    IF v_org IS NULL THEN
      RAISE EXCEPTION 'Join code is not active';
    END IF;
  ELSE
    RAISE EXCEPTION 'Registration reference is required';
  END IF;

  UPDATE public.profiles
  SET organization_id = v_org
  WHERE user_id = v_uid
    AND organization_id IS DISTINCT FROM v_org;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'dispensary_manager')
  ON CONFLICT (user_id, role) DO NOTHING;

  IF p_application_id IS NOT NULL THEN
    UPDATE public.dispensary_applications
    SET registration_completed = true
    WHERE id = p_application_id
      AND COALESCE(registration_completed, false) = false;
  END IF;

  RETURN jsonb_build_object('ok', true, 'organization_id', v_org);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_manager_registration(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_manager_registration(uuid, text) TO authenticated;
