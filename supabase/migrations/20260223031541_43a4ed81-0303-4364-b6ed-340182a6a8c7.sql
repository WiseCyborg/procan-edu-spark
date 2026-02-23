CREATE OR REPLACE FUNCTION public.get_course_state(p_course_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
  v_modules JSONB;
  v_resume JSONB;
  v_access JSONB;
  v_total_modules INTEGER;
  v_completed_modules INTEGER;
  v_snapshot JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get access snapshot first
  v_snapshot := get_access_snapshot(p_course_id);
  v_access := v_snapshot;

  -- Get modules with their states
  SELECT jsonb_agg(
    jsonb_build_object(
      'module_id', cm.id,
      'module_number', cm.module_number,
      'title', cm.title,
      'is_active', cm.is_active,
      'is_manager_only', COALESCE(cm.is_manager_only, false),
      'status', CASE
        WHEN NOT COALESCE(cm.is_active, true) THEN 'locked'
        WHEN up.completed_at IS NOT NULL THEN 'completed'
        WHEN up.id IS NOT NULL AND up.completed_at IS NULL THEN 'in_progress'
        WHEN cm.module_number = 1 THEN 'available'
        WHEN EXISTS (
          SELECT 1 FROM user_progress prev_up
          JOIN course_modules prev_cm ON prev_cm.id = prev_up.module_id
          WHERE prev_cm.course_id = p_course_id
            AND prev_cm.module_number = cm.module_number - 1
            AND prev_up.user_id = v_user_id
            AND prev_up.completed_at IS NOT NULL
        ) THEN 'available'
        ELSE 'locked'
      END,
      'lock_reason', CASE
        WHEN NOT COALESCE(cm.is_active, true) THEN 'module_unpublished'
        WHEN (v_access->>'can_access_course')::boolean = false THEN v_access->>'deny_reason'
        WHEN cm.module_number > 1 AND NOT EXISTS (
          SELECT 1 FROM user_progress prev_up
          JOIN course_modules prev_cm ON prev_cm.id = prev_up.module_id
          WHERE prev_cm.course_id = p_course_id
            AND prev_cm.module_number = cm.module_number - 1
            AND prev_up.user_id = v_user_id
            AND prev_up.completed_at IS NOT NULL
        ) THEN 'prerequisite_modules_incomplete'
        ELSE NULL
      END,
      'lock_reason_detail', CASE
        WHEN cm.module_number > 1 AND NOT EXISTS (
          SELECT 1 FROM user_progress prev_up
          JOIN course_modules prev_cm ON prev_cm.id = prev_up.module_id
          WHERE prev_cm.course_id = p_course_id
            AND prev_cm.module_number = cm.module_number - 1
            AND prev_up.user_id = v_user_id
            AND prev_up.completed_at IS NOT NULL
        ) THEN jsonb_build_object('required_module', cm.module_number - 1)
        ELSE NULL
      END
    ) ORDER BY cm.module_number
  )
  INTO v_modules
  FROM course_modules cm
  LEFT JOIN user_progress up ON up.module_id = cm.id AND up.user_id = v_user_id
  WHERE cm.course_id = p_course_id;

  -- Count totals
  SELECT COUNT(*), COUNT(*) FILTER (WHERE up.completed_at IS NOT NULL)
  INTO v_total_modules, v_completed_modules
  FROM course_modules cm
  LEFT JOIN user_progress up ON up.module_id = cm.id AND up.user_id = v_user_id
  WHERE cm.course_id = p_course_id AND COALESCE(cm.is_active, true) = true;

  -- Get resume state
  SELECT jsonb_build_object(
    'module_id', crs.module_id,
    'module_number', crs.module_number,
    'last_tab', crs.last_tab,
    'last_page_index', crs.last_page_index,
    'last_activity_at', crs.last_activity_at
  )
  INTO v_resume
  FROM course_resume_state crs
  WHERE crs.user_id = v_user_id AND crs.course_id = p_course_id;

  -- Build result
  v_result := jsonb_build_object(
    'course_id', p_course_id,
    'access', v_access,
    'modules', COALESCE(v_modules, '[]'::jsonb),
    'total_modules', COALESCE(v_total_modules, 0),
    'completed_modules', COALESCE(v_completed_modules, 0),
    'completion_percentage', CASE 
      WHEN COALESCE(v_total_modules, 0) = 0 THEN 0 
      ELSE ROUND((COALESCE(v_completed_modules, 0)::numeric / v_total_modules::numeric) * 100) 
    END,
    'resume_target', v_resume
  );

  RETURN v_result;
END;
$function$;