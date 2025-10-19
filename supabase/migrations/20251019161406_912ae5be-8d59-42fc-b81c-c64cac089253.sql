-- Phase 1: Remove problematic trigger that blocks profile saves
DROP TRIGGER IF EXISTS notify_critical_profile_updates ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_critical_profile_changes();

-- Phase 4: Add email cache to profiles for safe admin email lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_cache TEXT;

-- Create trigger to sync email from auth.users on profile insert/update
CREATE OR REPLACE FUNCTION sync_profile_email()
RETURNS TRIGGER AS $$
BEGIN
  SELECT email INTO NEW.email_cache
  FROM auth.users
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER sync_profile_email_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_profile_email();