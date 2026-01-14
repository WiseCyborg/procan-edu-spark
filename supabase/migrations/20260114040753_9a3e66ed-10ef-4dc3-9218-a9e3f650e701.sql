-- Update get_course_launch_target to include tab and page in the route
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
  v_route text;
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
    
    IF v_resume_state IS NOT NULL AND v_resume_state.module_number >= 1 THEN
      v_cta_label := 'continue';
    ELSE
      v_cta_label := 'start';
    END IF;
  END IF;
  
  -- Build start target with FULL route including tab and page
  IF v_resume_state IS NOT NULL THEN
    -- Build route with query params for exact position
    v_route := '/course/part' || v_resume_state.module_number::text;
    
    -- Add query params for tab and page
    IF v_resume_state.last_tab IS NOT NULL AND v_resume_state.last_tab != 'overview' THEN
      v_route := v_route || '?tab=' || v_resume_state.last_tab;
      IF v_resume_state.last_page_index > 0 THEN
        v_route := v_route || '&page=' || v_resume_state.last_page_index::text;
      END IF;
    ELSIF v_resume_state.last_page_index > 0 THEN
      v_route := v_route || '?page=' || v_resume_state.last_page_index::text;
    END IF;
    
    v_start_target := jsonb_build_object(
      'type', 'module_page',
      'module_id', v_resume_state.module_id,
      'module_number', v_resume_state.module_number,
      'page_index', v_resume_state.last_page_index,
      'tab', v_resume_state.last_tab,
      'route', v_route
    );
  ELSE
    v_start_target := jsonb_build_object(
      'type', 'module_overview',
      'module_id', v_first_module.id,
      'module_number', v_first_module.module_number,
      'route', '/course/part' || v_first_module.module_number::text
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