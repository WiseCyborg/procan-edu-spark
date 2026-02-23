
CREATE OR REPLACE FUNCTION public.get_access_snapshot(p_course_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_course record;
  v_has_entitlement boolean := false;
  v_prereq_completed boolean := true;
  v_roles jsonb := '[]'::jsonb;
BEGIN
  -- If no course specified, use RVT core
  IF p_course_id IS NULL THEN
    p_course_id := 'e6841a2f-4e92-47c3-9ed4-243ccc22338b'::uuid;
  END IF;

  -- Get course info
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;

  IF v_course IS NULL THEN
    RETURN jsonb_build_object(
      'can_access_course', false,
      'deny_reason', 'course_not_found',
      'course_id', p_course_id,
      'roles', '[]'::jsonb
    );
  END IF;

  -- Public consumer courses don't require auth or payment
  IF v_course.course_type = 'consumer' AND v_course.is_public = true AND v_course.payment_required = false THEN
    RETURN jsonb_build_object(
      'can_access_course', true,
      'deny_reason', null,
      'course_id', p_course_id,
      'is_public', true,
      'roles', '[]'::jsonb
    );
  END IF;

  -- Anonymous users need to login for paid/professional courses
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_access_course', false,
      'deny_reason', 'auth_required',
      'course_id', p_course_id,
      'roles', '[]'::jsonb
    );
  END IF;

  -- Populate roles now that we have a user
  SELECT coalesce(jsonb_agg(ur.role ORDER BY ur.role), '[]'::jsonb)
  INTO v_roles
  FROM public.user_roles ur
  WHERE ur.user_id = v_user_id;

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
        'can_access_course', false,
        'deny_reason', 'prerequisite_required',
        'course_id', p_course_id,
        'prerequisite_course_id', v_course.prerequisite_course_id,
        'roles', coalesce(v_roles, '[]'::jsonb)
      );
    END IF;
  END IF;

  -- Check entitlement for paid courses
  IF v_course.payment_required = true THEN
    -- Direct course entitlement
    SELECT EXISTS (
      SELECT 1 FROM course_entitlements 
      WHERE user_id = v_user_id 
        AND course_id = p_course_id 
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    ) INTO v_has_entitlement;

    -- Org membership entitlement
    IF NOT v_has_entitlement THEN
      SELECT EXISTS (
        SELECT 1 FROM organization_members om
        JOIN organizations o ON o.id = om.organization_id
        WHERE om.user_id = v_user_id 
          AND om.member_type IN ('employee', 'coordinator', 'manager', 'owner')
          AND om.status = 'active'
      ) INTO v_has_entitlement;
    END IF;

    IF NOT v_has_entitlement THEN
      RETURN jsonb_build_object(
        'can_access_course', false,
        'deny_reason', 'payment_required',
        'course_id', p_course_id,
        'price_cents', v_course.price_cents,
        'currency', v_course.currency,
        'roles', coalesce(v_roles, '[]'::jsonb)
      );
    END IF;
  END IF;

  -- All checks passed
  RETURN jsonb_build_object(
    'can_access_course', true,
    'deny_reason', null,
    'course_id', p_course_id,
    'has_entitlement', v_has_entitlement,
    'roles', coalesce(v_roles, '[]'::jsonb)
  );
END;
$function$;
