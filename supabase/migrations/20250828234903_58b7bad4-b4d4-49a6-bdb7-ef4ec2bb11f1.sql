-- Fix security warnings by adding search_path to functions

-- Fix link_employee_to_organization function
CREATE OR REPLACE FUNCTION public.link_employee_to_organization()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  -- Update the profile with organization_id based on dispensary_access_key
  IF NEW.dispensary_access_key IS NOT NULL THEN
    UPDATE public.profiles
    SET organization_id = (
      SELECT id 
      FROM public.organizations 
      WHERE unique_access_key = NEW.dispensary_access_key 
        AND admin_approved = true 
        AND payment_status = 'paid'
      LIMIT 1
    )
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix get_organization_employees function
CREATE OR REPLACE FUNCTION public.get_organization_employees(org_id UUID)
RETURNS TABLE(
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ,
  progress_percentage INTEGER,
  certificates_count INTEGER,
  last_activity TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.first_name,
    p.last_name,
    au.email,
    p.phone,
    p.created_at,
    COALESCE(
      ROUND(
        (COUNT(CASE WHEN up.is_completed = true THEN 1 END) * 100.0 / 18)::NUMERIC, 0
      )::INTEGER, 0
    ) as progress_percentage,
    COALESCE(COUNT(c.id)::INTEGER, 0) as certificates_count,
    GREATEST(p.updated_at, MAX(up.updated_at)) as last_activity
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.user_progress up ON up.user_id = p.user_id
  LEFT JOIN public.certificates c ON c.user_id = p.user_id AND c.is_revoked = false
  WHERE p.organization_id = org_id
  GROUP BY p.user_id, p.first_name, p.last_name, au.email, p.phone, p.created_at, p.updated_at;
END;
$$;

-- Fix get_user_organization_id function
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid UUID)
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE user_id = user_uuid;
  
  RETURN org_id;
END;
$$;