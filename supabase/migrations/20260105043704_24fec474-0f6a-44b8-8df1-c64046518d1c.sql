-- Grant execute permission on get_approved_organizations to authenticated users
GRANT EXECUTE ON FUNCTION public.get_approved_organizations() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_approved_organizations() TO anon;