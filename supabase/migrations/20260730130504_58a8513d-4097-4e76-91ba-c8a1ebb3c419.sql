-- Fix a paywall-bypass bug in get_course_launch_target.
-- get_access_snapshot returns the key 'can_access_course', but the launch
-- function read 'can_access' (wrong key -> NULL), so its deny branch never
-- fired and it granted access to unpaid users. Aligns the launch function to
-- read the correct key. Idempotent; matches state already live in production.

CREATE OR REPLACE FUNCTION public.get_course_launch_target(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_course record;
  v_access jsonb;
  v_cta_label text := 'start';
  v_has_certificate boolean := false;
  v_start_target jsonb;
  v_first_module record;
  v_resume_state record;
  v_route text;
  v_is_specialty boolean := false;
BEGIN
  v_user_id := auth.uid();

  SELECT * INTO v_course FROM courses WHERE id = p_course_id AND is_active = true;

  IF v_course IS NULL THEN
    RETURN jsonb_build_object('can_access', false,'deny_reason','course_not_found',
      'cta_label','unavailable','has_certificate',false,'start_target',null);
  END IF;

  v_is_specialty := (v_course.course_type = 'specialty');

  IF NOT EXISTS (SELECT 1 FROM course_modules WHERE course_id = p_course_id AND is_active = true) THEN
    RETURN jsonb_build_object('can_access', false,'deny_reason','course_not_published',
      'cta_label','coming_soon','has_certificate',false,'start_target',null);
  END IF;

  SELECT id, module_number INTO v_first_module
  FROM course_modules WHERE course_id = p_course_id AND is_active = true
  ORDER BY module_number LIMIT 1;

  v_access := get_access_snapshot(p_course_id);

  IF v_course.course_type = 'consumer' AND v_course.is_public = true AND v_course.payment_required = false THEN
    v_start_target := jsonb_build_object('type','module_overview','module_id',v_first_module.id,
      'module_number',v_first_module.module_number,'route','/consumer-education/' || p_course_id::text);
    RETURN jsonb_build_object('can_access', true,'deny_reason',null,'cta_label','start',
      'has_certificate',false,'start_target',v_start_target,'course_type',v_course.course_type,
      'price_cents',v_course.price_cents);
  END IF;

  -- FIX: get_access_snapshot returns 'can_access_course', not 'can_access'.
  IF NOT COALESCE((v_access->>'can_access_course')::boolean, false) THEN
    RETURN jsonb_build_object('can_access', false,'deny_reason', v_access->>'deny_reason',
      'cta_label', CASE
        WHEN v_access->>'deny_reason' = 'payment_required' THEN 'purchase'
        WHEN v_access->>'deny_reason' = 'prerequisite_required' THEN 'locked'
        WHEN v_access->>'deny_reason' = 'auth_required' THEN 'login'
        ELSE 'unavailable' END,
      'has_certificate',false,'start_target',null,
      'price_cents',v_course.price_cents,'course_type',v_course.course_type);
  END IF;

  SELECT EXISTS (SELECT 1 FROM user_certificates WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'issued')
      OR EXISTS (SELECT 1 FROM certificates WHERE user_id = v_user_id AND course_id = p_course_id AND is_revoked = false)
    INTO v_has_certificate;

  IF v_has_certificate THEN
    v_cta_label := 'view_certificate';
  ELSE
    SELECT * INTO v_resume_state FROM course_resume_state
    WHERE user_id = v_user_id AND course_id = p_course_id
    ORDER BY last_activity_at DESC LIMIT 1;
    IF v_resume_state IS NOT NULL AND v_resume_state.module_number >= 1 THEN
      v_cta_label := 'continue';
    ELSE
      v_cta_label := 'start';
    END IF;
  END IF;

  IF v_is_specialty THEN
    IF v_resume_state IS NOT NULL AND v_resume_state.module_id IS NOT NULL THEN
      v_start_target := jsonb_build_object('type','module_page','module_id',v_resume_state.module_id,
        'module_number',v_resume_state.module_number,'page_index',v_resume_state.last_page_index,
        'route','/courses/' || p_course_id::text || '/learn?module=' || v_resume_state.module_id::text);
    ELSE
      v_start_target := jsonb_build_object('type','module_overview','module_id',v_first_module.id,
        'module_number',v_first_module.module_number,'route','/courses/' || p_course_id::text || '/learn');
    END IF;
  ELSIF v_resume_state IS NOT NULL THEN
    v_route := '/course/part' || v_resume_state.module_number::text;
    IF v_resume_state.last_tab IS NOT NULL AND v_resume_state.last_tab != 'overview' THEN
      v_route := v_route || '?tab=' || v_resume_state.last_tab;
      IF v_resume_state.last_page_index > 0 THEN
        v_route := v_route || '&page=' || v_resume_state.last_page_index::text;
      END IF;
    ELSIF v_resume_state.last_page_index > 0 THEN
      v_route := v_route || '?page=' || v_resume_state.last_page_index::text;
    END IF;
    v_start_target := jsonb_build_object('type','module_page','module_id',v_resume_state.module_id,
      'module_number',v_resume_state.module_number,'page_index',v_resume_state.last_page_index,
      'tab',v_resume_state.last_tab,'route',v_route);
  ELSE
    v_start_target := jsonb_build_object('type','module_overview','module_id',v_first_module.id,
      'module_number',v_first_module.module_number,'route','/course/part' || v_first_module.module_number::text);
  END IF;

  RETURN jsonb_build_object('can_access', true,'deny_reason',null,'cta_label',v_cta_label,
    'has_certificate',v_has_certificate,'start_target',v_start_target,
    'course_type',v_course.course_type,'price_cents',v_course.price_cents);
END;
$function$;