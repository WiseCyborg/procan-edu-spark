-- Drop existing function to allow schema change
DROP FUNCTION IF EXISTS public.get_organization_employees(uuid);

-- Recreate with correct schema
CREATE OR REPLACE FUNCTION public.get_organization_employees(org_id uuid)
RETURNS TABLE (
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  role text,
  progress_percentage integer,
  current_tier text,
  certificate_status text,
  certificate_number text,
  last_login timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.first_name,
    p.last_name,
    p.email_cache as email,
    COALESCE(ur.role::text, 'student') as role,
    COALESCE(
      (SELECT COUNT(*) * 100 / 24 
       FROM public.user_progress up 
       WHERE up.user_id = p.user_id AND up.is_completed = true), 
      0
    )::integer as progress_percentage,
    COALESCE(p.stoplight_tier, 'Green') as current_tier,
    CASE 
      WHEN c.id IS NOT NULL AND c.expiry_date > NOW() THEN 'valid'
      WHEN c.id IS NOT NULL AND c.expiry_date <= NOW() THEN 'expired'
      ELSE 'none'
    END as certificate_status,
    c.certificate_number,
    p.last_login
  FROM public.profiles p
  LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
  LEFT JOIN public.certificates c ON c.user_id = p.user_id AND c.is_revoked = false
  WHERE p.organization_id = get_organization_employees.org_id
  ORDER BY p.created_at DESC;
END;
$$;