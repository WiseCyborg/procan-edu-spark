-- Phase 2: Fix organization-employee relationships and data integrity

-- First, create a migration to link existing profiles to organizations
-- using their dispensary access keys
UPDATE public.profiles 
SET organization_id = organizations.id
FROM public.organizations
WHERE profiles.dispensary_access_key = organizations.unique_access_key
  AND profiles.organization_id IS NULL
  AND organizations.admin_approved = true;

-- Create index for better performance on organization queries
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON public.profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_access_key ON public.organizations(unique_access_key);

-- Add trigger to automatically link new employees to organizations during registration
CREATE OR REPLACE FUNCTION public.link_employee_to_organization()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to fire after profile insert/update
DROP TRIGGER IF EXISTS trigger_link_employee_to_organization ON public.profiles;
CREATE TRIGGER trigger_link_employee_to_organization
  AFTER INSERT OR UPDATE OF dispensary_access_key ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.link_employee_to_organization();

-- Create a function to get organization employees with proper relationships
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get dispensary manager's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM public.profiles
  WHERE user_id = user_uuid;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;