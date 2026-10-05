-- Required agent modules are the active modules that are not manager-only
-- (0–18 and 24–29). Module 24 was locked until module 23, which is
-- supervisory-only, so a buyer could not open the rest of the required set.
-- The previous required module is now the previous active non-manager module.
-- Supervisory modules still follow the previous module number.
-- required_total is unchanged: active modules where is_manager_only is false.

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
  v_required_total INTEGER;
  v_required_completed INTEGER;
  v_snapshot JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  v_snapshot := get_access_snapshot(p_course_id);
  v_access := v_snapshot;

  SELECT jsonb_agg(module_row ORDER BY (module_row->>'module_number')::int)
  INTO v_modules
  FROM (
    SELECT jsonb_build_object(
      'module_id', cm.id,
      'module_number', cm.module_number,
      'title', cm.title,
      'is_active', cm.is_active,
      'is_manager_only', COALESCE(cm.is_manager_only, false),
      'status', CASE
        WHEN NOT COALESCE(cm.is_active, true) THEN 'locked'
        WHEN up.completed_at IS NOT NULL THEN 'completed'
        WHEN up.id IS NOT NULL AND up.completed_at IS NULL THEN 'in_progress'
        WHEN prev.module_number IS NULL THEN 'available'
        WHEN prev_up.completed_at IS NOT NULL THEN 'available'
        ELSE 'locked'
      END,
      'lock_reason', CASE
        WHEN NOT COALESCE(cm.is_active, true) THEN 'module_unpublished'
        WHEN (v_access->>'can_access_course')::boolean = false THEN v_access->>'deny_reason'
        WHEN prev.module_number IS NOT NULL AND prev_up.completed_at IS NULL
          THEN 'prerequisite_modules_incomplete'
        ELSE NULL
      END,
      'lock_reason_detail', CASE
        WHEN prev.module_number IS NOT NULL AND prev_up.completed_at IS NULL
          THEN jsonb_build_object('required_module', prev.module_number)
        ELSE NULL
      END
    ) AS module_row
    FROM course_modules cm
    LEFT JOIN user_progress up
      ON up.module_id = cm.id AND up.user_id = v_user_id
    LEFT JOIN LATERAL (
      SELECT prev_cm.module_number, prev_cm.id
      FROM course_modules prev_cm
      WHERE prev_cm.course_id = cm.course_id
        AND COALESCE(prev_cm.is_active, true)
        AND prev_cm.module_number < cm.module_number
        AND (
          CASE
            WHEN COALESCE(cm.is_manager_only, false)
              THEN prev_cm.module_number = cm.module_number - 1
            ELSE NOT COALESCE(prev_cm.is_manager_only, false)
          END
        )
      ORDER BY prev_cm.module_number DESC
      LIMIT 1
    ) prev ON true
    LEFT JOIN user_progress prev_up
      ON prev_up.module_id = prev.id
     AND prev_up.user_id = v_user_id
     AND prev_up.completed_at IS NOT NULL
    WHERE cm.course_id = p_course_id
  ) listed;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE up.completed_at IS NOT NULL),
    COUNT(*) FILTER (WHERE NOT COALESCE(cm.is_manager_only, false)),
    COUNT(*) FILTER (WHERE NOT COALESCE(cm.is_manager_only, false) AND up.completed_at IS NOT NULL)
  INTO v_total_modules, v_completed_modules, v_required_total, v_required_completed
  FROM course_modules cm
  LEFT JOIN user_progress up ON up.module_id = cm.id AND up.user_id = v_user_id
  WHERE cm.course_id = p_course_id AND COALESCE(cm.is_active, true) = true;

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

  v_result := jsonb_build_object(
    'course_id', p_course_id,
    'access', v_access,
    'modules', COALESCE(v_modules, '[]'::jsonb),
    'total_modules', COALESCE(v_total_modules, 0),
    'completed_modules', COALESCE(v_completed_modules, 0),
    'required_total', COALESCE(v_required_total, 0),
    'required_completed', COALESCE(v_required_completed, 0),
    'exam_eligible', (COALESCE(v_required_completed, 0) >= COALESCE(v_required_total, 0) AND COALESCE(v_required_total, 0) > 0),
    'completion_percentage', CASE
      WHEN COALESCE(v_total_modules, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(v_completed_modules, 0)::numeric / v_total_modules::numeric) * 100)
    END,
    'required_completion_percentage', CASE
      WHEN COALESCE(v_required_total, 0) = 0 THEN 0
      ELSE ROUND((COALESCE(v_required_completed, 0)::numeric / v_required_total::numeric) * 100)
    END,
    'resume_target', v_resume
  );

  RETURN v_result;
END;
$function$;
