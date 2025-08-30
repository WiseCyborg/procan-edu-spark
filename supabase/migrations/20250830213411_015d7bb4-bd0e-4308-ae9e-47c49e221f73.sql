-- Final cleanup of auth event processing system
-- Remove any remaining cron jobs related to auth events
SELECT cron.unschedule('process-auth-events');

-- Ensure the process_auth_events function is completely removed
DROP FUNCTION IF EXISTS public.process_auth_events() CASCADE;

-- Remove any remaining auth event triggers on auth.users table
DROP TRIGGER IF EXISTS auth_users_trigger ON auth.users;
DROP TRIGGER IF EXISTS trigger_custom_auth_emails ON auth.users;
DROP TRIGGER IF EXISTS auth_user_events ON auth.users;
DROP TRIGGER IF EXISTS handle_auth_user_updates ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Clean up any remaining functions that might reference deleted email services
DROP FUNCTION IF EXISTS public.handle_auth_events() CASCADE;
DROP FUNCTION IF EXISTS public.trigger_custom_auth_emails() CASCADE;

-- Ensure no leftover tables or logs
DROP TABLE IF EXISTS public.auth_event_log CASCADE;
DROP TABLE IF EXISTS public.email_fallback_log CASCADE;