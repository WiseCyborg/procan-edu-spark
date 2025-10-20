-- Create admin user overview view that joins auth.users with profiles
CREATE OR REPLACE VIEW admin_user_overview AS
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
LEFT JOIN public.organizations o ON o.id = p.organization_id;

-- Grant access to authenticated users (RLS will restrict to admins only)
GRANT SELECT ON admin_user_overview TO authenticated;

-- Fix email cache sync trigger
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT email INTO NEW.email_cache
  FROM auth.users
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_email_on_insert_or_update ON public.profiles;

-- Create trigger for email sync
CREATE TRIGGER sync_email_on_insert_or_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_email();

-- Backfill existing emails in profiles
UPDATE public.profiles p
SET email_cache = (SELECT email FROM auth.users WHERE id = p.user_id)
WHERE email_cache IS NULL;