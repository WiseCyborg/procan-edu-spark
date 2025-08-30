-- Remove the password reset tokens table as we'll use Supabase's native auth
DROP TABLE IF EXISTS public.password_reset_tokens;

-- Remove the password reset token generation function
DROP FUNCTION IF EXISTS public.generate_password_reset_token();

-- Remove the cleanup function for expired tokens
DROP FUNCTION IF EXISTS public.cleanup_expired_password_reset_tokens();