DO $$
DECLARE
  v_course_id uuid := 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';
  v_emp1 uuid := 'f167e515-4fde-42a6-9fa6-77c227ffd495';
  v_emp2 uuid := 'af0018c3-ecfa-41ed-a3b0-55716ae0c3b5';
BEGIN
  INSERT INTO public.user_progress
    (user_id, course_id, module_id, is_completed, score, time_spent, completed_at)
  SELECT
    u.user_id, v_course_id, cm.id, true, 100, 300, now()
  FROM public.course_modules cm
  CROSS JOIN (VALUES (v_emp1), (v_emp2)) AS u(user_id)
  WHERE cm.course_id = v_course_id
    AND cm.module_number BETWEEN 0 AND 18
  ON CONFLICT (user_id, module_id) DO UPDATE SET
    is_completed = true,
    score = GREATEST(COALESCE(public.user_progress.score, 0), 100),
    completed_at = COALESCE(public.user_progress.completed_at, now()),
    updated_at = now();

  INSERT INTO public.course_completions
    (user_id, course_id, completion_percent, passed, completed_at)
  VALUES
    (v_emp1, v_course_id, 100, false, now()),
    (v_emp2, v_course_id, 100, false, now())
  ON CONFLICT ON CONSTRAINT course_completions_user_course_unique DO UPDATE SET
    completion_percent = 100,
    completed_at = COALESCE(public.course_completions.completed_at, now());
END $$;