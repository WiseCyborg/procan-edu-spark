
-- Drop the overly-broad ALL policy and replace with specific operation policies
DROP POLICY IF EXISTS "Organization managers can manage invitations" ON public.staff_invitations;

-- 1) Org managers can READ invites for their org (dispensary_admin or training_coordinator)
CREATE POLICY "org_managers_can_read_invites"
ON public.staff_invitations
FOR SELECT
TO authenticated
USING (
  -- Platform admins can read all
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  -- Org managers can read their org's invites
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = staff_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('dispensary_admin', 'training_coordinator')
  )
);

-- 2) Org managers can CREATE invites for their org
CREATE POLICY "org_managers_can_create_invites"
ON public.staff_invitations
FOR INSERT
TO authenticated
WITH CHECK (
  -- Platform admins can create for any org
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  -- Org managers can create for their org
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = staff_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('dispensary_admin', 'training_coordinator')
  )
);

-- 3) Org managers can UPDATE invites for their org (resend, change status)
CREATE POLICY "org_managers_can_update_invites"
ON public.staff_invitations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = staff_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('dispensary_admin', 'training_coordinator')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = staff_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('dispensary_admin', 'training_coordinator')
  )
);

-- 4) Org managers can DELETE/revoke invites
CREATE POLICY "org_managers_can_delete_invites"
ON public.staff_invitations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
  OR
  EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = staff_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND om.role IN ('dispensary_admin', 'training_coordinator')
  )
);

-- 5) Revoke any anon/public access to be safe
REVOKE ALL ON public.staff_invitations FROM anon;
REVOKE ALL ON public.staff_invitations FROM public;
