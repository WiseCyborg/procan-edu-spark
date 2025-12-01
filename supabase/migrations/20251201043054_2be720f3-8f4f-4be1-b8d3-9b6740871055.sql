-- Create site_content_metadata table for tracking content updates
CREATE TABLE IF NOT EXISTS public.site_content_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT UNIQUE NOT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_content_metadata ENABLE ROW LEVEL SECURITY;

-- Everyone can read content metadata
CREATE POLICY "Anyone can view content metadata"
  ON public.site_content_metadata
  FOR SELECT
  USING (true);

-- Only admins can update content metadata
CREATE POLICY "Admins can manage content metadata"
  ON public.site_content_metadata
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'::app_role
    )
  );

-- Insert initial FAQ entry
INSERT INTO public.site_content_metadata (content_key, last_updated_at, notes)
VALUES ('faq', now(), 'Initial FAQ content setup')
ON CONFLICT (content_key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_content_metadata_content_key 
  ON public.site_content_metadata(content_key);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE site_content_metadata;