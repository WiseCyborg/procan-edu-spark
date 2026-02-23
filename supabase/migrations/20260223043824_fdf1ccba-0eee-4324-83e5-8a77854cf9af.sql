
CREATE OR REPLACE FUNCTION public.log_exam_identity_verification(p_checkin_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_target uuid;
  v_attempt uuid;
  v_has_photo boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT user_id, attempt_id, (photo_url IS NOT NULL)
    INTO v_target, v_attempt, v_has_photo
  FROM public.exam_checkins
  WHERE id = p_checkin_id;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Check-in not found: %', p_checkin_id;
  END IF;

  INSERT INTO public.security_audit_log (
    user_id, action_type, table_name, record_id, old_values, new_values, created_at
  ) VALUES (
    v_actor,
    'exam_identity_verified',
    'exam_checkins',
    p_checkin_id,
    NULL,
    jsonb_build_object(
      'target_user_id', v_target,
      'attempt_id', v_attempt,
      'has_photo', v_has_photo,
      'verified_by', v_actor
    ),
    now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_exam_identity_verification(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.log_exam_identity_verification(uuid) TO authenticated;
