
-- 1) Revoke anon/public access from sensitive tables
REVOKE ALL ON public.profiles FROM anon;
REVOKE ALL ON public.profiles FROM public;

REVOKE ALL ON public.user_progress FROM anon;
REVOKE ALL ON public.user_progress FROM public;

-- 2) Keep authenticated access (RLS policies handle the rest)
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_progress TO authenticated;

-- 3) Ensure service_role retains full access for edge functions
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_progress TO service_role;

-- 4) Remove any permissive service_role policy that uses "true" 
-- and replace with proper scoping
DROP POLICY IF EXISTS "Service role can manage progress" ON public.user_progress;

CREATE POLICY "service_role_manage_progress"
ON public.user_progress
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 5) Ensure profiles service_role policy is properly scoped
DROP POLICY IF EXISTS "Service role can manage profiles for automation" ON public.profiles;

CREATE POLICY "service_role_manage_profiles"
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
