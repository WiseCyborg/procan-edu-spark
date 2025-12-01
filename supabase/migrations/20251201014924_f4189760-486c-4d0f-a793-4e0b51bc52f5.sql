-- Create video_assets table for centralized video management
CREATE TABLE video_assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_key TEXT UNIQUE NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  file_size_mb DECIMAL(10,2),
  thumbnail_url TEXT,
  module_id UUID REFERENCES course_modules(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE video_assets ENABLE ROW LEVEL SECURITY;

-- Admins can manage video assets
CREATE POLICY "Admins can manage video assets" ON video_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Public can view active videos
CREATE POLICY "Public can view active videos" ON video_assets
  FOR SELECT USING (is_active = true);

-- Insert the existing orientation video
INSERT INTO video_assets (asset_key, storage_path, public_url, title, description, is_active)
VALUES (
  'orientation_video',
  'ProCannVideos/ProCann Orientation Video.mp4',
  'https://zhmpwczrvitomsxjwpzc.supabase.co/storage/v1/object/public/ProCannVideos/ProCann%20Orientation%20Video.mp4',
  'ProCann Orientation Video',
  'Welcome and platform orientation for new trainees',
  true
);

-- Update module 0 with orientation video URL
UPDATE course_modules 
SET video_url = 'https://zhmpwczrvitomsxjwpzc.supabase.co/storage/v1/object/public/ProCannVideos/ProCann%20Orientation%20Video.mp4'
WHERE module_number = 0;