-- Create a table to store email template preferences
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL UNIQUE,
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