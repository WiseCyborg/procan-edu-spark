-- Fix 1: Drop policies that depend on get_user_organization function
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Training coordinators view org employees" ON public.profiles;

-- Fix 2: Recreate get_user_organization function to properly bypass RLS
DROP FUNCTION IF EXISTS public.get_user_organization(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id uuid;
BEGIN
  -- This runs with definer privileges, bypassing RLS
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
  
  RETURN org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_organization TO authenticated, service_role;

-- Fix 3: Recreate simplified policies without recursion issues
CREATE POLICY "Training coordinators view org employees"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id  -- Can always see own profile
  OR has_role(auth.uid(), 'admin'::app_role)  -- Admins see all
  OR (
    -- Training coordinators and managers can see profiles in their org
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN profiles p_self ON p_self.user_id = ur.user_id
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('training_coordinator'::app_role, 'dispensary_manager'::app_role)
        AND p_self.organization_id = profiles.organization_id
    )
  )
);

-- Fix 4: Add INSERT policy for user_operation_logs so users can log their own operations
DROP POLICY IF EXISTS "Users can insert their own operation logs" ON public.user_operation_logs;

CREATE POLICY "Users can insert their own operation logs"
ON public.user_operation_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

GRANT INSERT ON public.user_operation_logs TO authenticated;