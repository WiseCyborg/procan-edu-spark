-- Phase 1 & 3: Storage bucket + user operation logging table

-- Create storage bucket for profile photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-photos bucket
CREATE POLICY "Users can upload their own photo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own photo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Create user_operation_logs table for monitoring
CREATE TABLE IF NOT EXISTS user_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  operation_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  operation_data JSONB,
  client_info JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for monitoring queries
CREATE INDEX IF NOT EXISTS idx_operation_logs_failure 
ON user_operation_logs(operation_type, success, created_at)
WHERE success = false;

CREATE INDEX IF NOT EXISTS idx_operation_logs_user 
ON user_operation_logs(user_id, created_at);

-- RLS for operation logs
ALTER TABLE user_operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all operation logs"
ON user_operation_logs FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage operation logs"
ON user_operation_logs FOR ALL
USING (auth.role() = 'service_role');

-- Add profile_photo_url to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'profile_photo_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_photo_url TEXT;
  END IF;
END $$;