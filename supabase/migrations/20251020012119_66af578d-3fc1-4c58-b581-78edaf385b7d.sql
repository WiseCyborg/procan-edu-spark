-- Drop the view and replace with a secure function
DROP VIEW IF EXISTS admin_user_overview;

-- Create a secure function instead of a view to access user data
CREATE OR REPLACE FUNCTION public.get_admin_user_overview()
RETURNS TABLE (
  user_id uuid,
  email text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  raw_user_meta_data jsonb,
  first_name text,
  last_name text,
  phone text,
  organization_id uuid,
  organization_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Return user data
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email,
    au.email_confirmed_at,
    au.created_at,
    au.last_sign_in_at,
    au.raw_user_meta_data,
    p.first_name,
    p.last_name,
    p.phone,
    p.organization_id,
    o.name as organization_name
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.user_id = au.id
  LEFT JOIN public.organizations o ON o.id = p.organization_id
  ORDER BY au.created_at DESC;
END;
$$;