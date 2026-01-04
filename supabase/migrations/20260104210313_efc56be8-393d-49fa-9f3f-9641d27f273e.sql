-- Fix permission denied for has_role function
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;