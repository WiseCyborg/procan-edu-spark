-- Grant execute permission on has_role function to authenticated users
-- This is safe because has_role is a SECURITY DEFINER function that only checks if a user has a role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Also grant to anon for public checks (like certificate verification)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;