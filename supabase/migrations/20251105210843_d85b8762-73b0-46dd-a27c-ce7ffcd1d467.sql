-- Create admin settings table for configurable alert recipients
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings"
ON public.admin_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default pipeline alert recipients
INSERT INTO public.admin_settings (setting_key, setting_value, description)
VALUES (
  'pipeline_alert_recipients',
  '["admin@procannedu.com"]'::jsonb,
  'Email addresses to notify for critical pipeline failures'
)
ON CONFLICT (setting_key) DO NOTHING;