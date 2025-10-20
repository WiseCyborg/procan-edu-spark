-- Phase 1: Create User Activity Log Infrastructure
CREATE TABLE public.user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN ('signup', 'signin', 'signout', 'password_reset', 'verification_sent', 'email_opened', 'email_clicked')),
  email text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes for fast queries
CREATE INDEX idx_user_activity_log_created_at ON public.user_activity_log(created_at DESC);
CREATE INDEX idx_user_activity_log_user_id ON public.user_activity_log(user_id);
CREATE INDEX idx_user_activity_log_type ON public.user_activity_log(activity_type);

-- Enable RLS
ALTER TABLE public.user_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert
CREATE POLICY "Service role can insert activity logs"
ON public.user_activity_log FOR INSERT
WITH CHECK (true);

-- Create trigger function to auto-log auth events
CREATE OR REPLACE FUNCTION public.log_auth_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log new user signups
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activity_log (user_id, activity_type, email, metadata)
    VALUES (
      NEW.id,
      'signup',
      NEW.email,
      jsonb_build_object(
        'created_at', NEW.created_at,
        'email_confirmed_at', NEW.email_confirmed_at,
        'raw_user_meta_data', NEW.raw_user_meta_data
      )
    );
  END IF;
  
  -- Log signin events when last_sign_in_at changes
  IF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    INSERT INTO public.user_activity_log (user_id, activity_type, email, metadata)
    VALUES (
      NEW.id,
      'signin',
      NEW.email,
      jsonb_build_object(
        'last_sign_in_at', NEW.last_sign_in_at,
        'sign_in_count', COALESCE((NEW.raw_app_meta_data->>'sign_in_count')::int, 0)
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users table
CREATE TRIGGER on_auth_user_activity
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.log_auth_activity();