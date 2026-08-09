CREATE OR REPLACE FUNCTION public.course_completion_already_passed(_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_completions c
    WHERE c.id = _id AND (c.passed IS TRUE OR COALESCE(c.completion_percent, 0) >= 100)
  )
$$;

DROP POLICY IF EXISTS "Users can insert their own completions" ON public.course_completions;
CREATE POLICY "Users can insert their own completions"
ON public.course_completions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND passed IS NOT TRUE
  AND COALESCE(completion_percent, 0) < 100
);

DROP POLICY IF EXISTS "Users can update their own completions" ON public.course_completions;
CREATE POLICY "Users can update their own completions"
ON public.course_completions
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    (passed IS NOT TRUE AND COALESCE(completion_percent, 0) < 100)
    OR public.course_completion_already_passed(id)
  )
);

DROP POLICY IF EXISTS "exam_checkins_employee_self_attest" ON public.exam_checkins;