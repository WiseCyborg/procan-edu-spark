-- Drop the existing function first
DROP FUNCTION IF EXISTS public.get_user_organization_id(uuid);

-- Create the security definer function to safely get user's org_id without RLS recursion
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- Create safe org manager policy using the security definer function
CREATE POLICY "Org managers view employees in their org"
ON profiles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()  -- Users can always see their own profile
  OR has_role(auth.uid(), 'admin')  -- Admins can see all
  OR (
    -- Managers can see profiles in their org
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('dispensary_manager', 'training_coordinator')
    )
    AND organization_id IS NOT NULL
    AND organization_id = get_user_organization_id(auth.uid())
  )
);