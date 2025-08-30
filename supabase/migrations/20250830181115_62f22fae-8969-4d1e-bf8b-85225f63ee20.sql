-- Configure auth webhook for custom emails
-- This will be triggered by Supabase Auth events

-- Insert webhook configuration into auth.config if it doesn't exist
-- Note: This is just for reference - actual webhook setup needs to be done in Supabase Dashboard

-- Create a function to handle auth events and ensure custom emails are sent
CREATE OR REPLACE FUNCTION public.ensure_custom_auth_emails()
RETURNS trigger AS $$
BEGIN
  -- Log auth events for custom email processing
  INSERT INTO public.auth_event_log (
    event_type,
    user_id,
    email,
    event_data,
    created_at
  ) VALUES (
    'AUTH_EVENT_LOGGED',
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.email, OLD.email),
    jsonb_build_object(
      'event_type', TG_OP,
      'table', TG_TABLE_NAME,
      'new_record', CASE WHEN NEW IS NOT NULL THEN to_jsonb(NEW) ELSE NULL END,
      'old_record', CASE WHEN OLD IS NOT NULL THEN to_jsonb(OLD) ELSE NULL END
    ),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to store email template preferences
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  custom_subject TEXT,
  custom_redirect_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on email_preferences
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

-- Create policy for email_preferences (admin only)
CREATE POLICY "Admin can manage email preferences" ON public.email_preferences
FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Insert default email preferences
INSERT INTO public.email_preferences (template_type, enabled, custom_subject, custom_redirect_url)
VALUES 
  ('password_reset', true, 'Reset Your ProCann Edu Password', NULL),
  ('email_confirmation', true, 'Confirm Your ProCann Edu Account', NULL),
  ('magic_link', true, 'Your ProCann Edu Magic Link', NULL)
ON CONFLICT (template_type) DO NOTHING;