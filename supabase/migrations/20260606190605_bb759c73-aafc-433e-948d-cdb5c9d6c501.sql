
-- Fix 1: course_modules public policy — drop blanket auth.uid() bypass
DROP POLICY IF EXISTS "Public course modules are viewable by everyone" ON public.course_modules;

CREATE POLICY "Public course modules are viewable by everyone"
ON public.course_modules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.id = course_modules.course_id
      AND courses.is_public = true
  )
);

-- Fix 2: communication_logs org manager policy — require non-null org match
DROP POLICY IF EXISTS "Organization managers can view their logs" ON public.communication_logs;

CREATE POLICY "Organization managers can view their logs"
ON public.communication_logs
FOR SELECT
USING (
  communication_logs.organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'dispensary_manager'::app_role
      AND p.organization_id IS NOT NULL
      AND p.organization_id = communication_logs.organization_id
  )
);
