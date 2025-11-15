-- Drop the existing admin policy that covers ALL operations
DROP POLICY IF EXISTS "Admins can manage all dispensary applications" ON dispensary_applications;

-- Create separate policies for each operation type
CREATE POLICY "Admins can view all dispensary applications"
ON dispensary_applications
AS PERMISSIVE
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can update dispensary applications"
ON dispensary_applications
AS PERMISSIVE
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can delete dispensary applications"
ON dispensary_applications
AS PERMISSIVE
FOR DELETE
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'::app_role
  )
);

-- Note: The public INSERT policy "Anyone can submit dispensary applications" 
-- already exists and will now work correctly without interference