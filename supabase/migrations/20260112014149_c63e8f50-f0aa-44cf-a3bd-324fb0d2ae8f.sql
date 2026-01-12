-- Drop existing function with different signature
DROP FUNCTION IF EXISTS public.get_access_snapshot(uuid);

-- Update get_access_snapshot to include prerequisite check
CREATE OR REPLACE FUNCTION public.get_access_snapshot(p_course_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id UUID;
  v_seat RECORD;
  v_course RECORD;
  v_prereq_check JSONB;
  v_has_certificate BOOLEAN := false;
  v_modules_completed INT := 0;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN jsonb_build_object('can_access_course', false, 'deny_reason', 'not_authenticated'); END IF;
  
  SELECT * INTO v_course FROM courses WHERE id = p_course_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('can_access_course', false, 'deny_reason', 'course_not_found'); END IF;
  
  v_prereq_check := check_course_prerequisite(v_user_id, p_course_id);
  IF NOT (v_prereq_check->>'can_access')::boolean THEN
    RETURN jsonb_build_object('can_access_course', false, 'deny_reason', v_prereq_check->>'reason', 'user_id', v_user_id, 'prerequisite_info', v_prereq_check);
  END IF;
  
  IF v_course.is_public = true THEN
    RETURN jsonb_build_object('can_access_course', true, 'user_id', v_user_id, 'course_id', p_course_id, 'course_type', v_course.course_type, 'access_type', 'public', 'prerequisite_info', v_prereq_check);
  END IF;
  
  SELECT os.* INTO v_seat FROM organization_seats os WHERE os.user_id = v_user_id AND os.status = 'active';
  IF NOT FOUND THEN RETURN jsonb_build_object('can_access_course', false, 'deny_reason', 'enrollment_required', 'user_id', v_user_id); END IF;
  IF v_seat.status = 'suspended' THEN RETURN jsonb_build_object('can_access_course', false, 'deny_reason', 'suspended', 'user_id', v_user_id); END IF;
  
  SELECT EXISTS (SELECT 1 FROM certificates WHERE user_id = v_user_id AND course_id = p_course_id AND (is_revoked IS NULL OR is_revoked = false)) INTO v_has_certificate;
  SELECT COUNT(*) INTO v_modules_completed FROM module_attempts WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'completed';
  
  RETURN jsonb_build_object('can_access_course', true, 'user_id', v_user_id, 'course_id', p_course_id, 'course_type', v_course.course_type, 'seat_id', v_seat.id, 'organization_id', v_seat.organization_id, 'has_certificate', v_has_certificate, 'modules_completed', v_modules_completed, 'total_modules', COALESCE(v_course.module_count, 0), 'prerequisite_info', v_prereq_check);
END;
$$;