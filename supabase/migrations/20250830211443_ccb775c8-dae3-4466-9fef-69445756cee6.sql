-- Remove custom email system components

-- Drop triggers that handle custom auth emails
DROP TRIGGER IF EXISTS auth_users_trigger ON auth.users;
DROP TRIGGER IF EXISTS trigger_custom_auth_emails ON auth.users;

-- Drop functions used by custom email system
DROP FUNCTION IF EXISTS public.handle_auth_events();
DROP FUNCTION IF EXISTS public.trigger_custom_auth_emails();
DROP FUNCTION IF EXISTS public.process_auth_events();

-- Drop tables used for custom email logging and fallback
DROP TABLE IF EXISTS public.email_fallback_log;
DROP TABLE IF EXISTS public.auth_event_log;
DROP TABLE IF EXISTS public.email_preferences;

-- Note: We're keeping other tables like email_logs, email_verification_codes 
-- as they may be used by other systems