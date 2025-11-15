-- Drop the existing restrictive policy that blocks public submissions
DROP POLICY IF EXISTS "Anyone can submit dispensary applications" ON dispensary_applications;

-- Create a new PERMISSIVE policy (uses OR logic with other policies)
-- This allows public users to submit applications while admin policy still controls other operations
CREATE POLICY "Anyone can submit dispensary applications"
ON dispensary_applications
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (true);