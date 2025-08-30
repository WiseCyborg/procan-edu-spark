-- Add missing UPDATE trigger on auth.users for password reset events
CREATE OR REPLACE TRIGGER handle_auth_user_updates
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_events();