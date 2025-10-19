-- Create storage bucket for mock certificate photos (temporary, auto-cleanup after 7 days)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'mock-certificate-photos', 
  'mock-certificate-photos', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- RLS Policy: Authenticated users can upload their own mock photos
CREATE POLICY "Users can upload mock photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mock-certificate-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Public read access (mock photos are public)
CREATE POLICY "Mock photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mock-certificate-photos');

-- RLS Policy: Users can update their own mock photos
CREATE POLICY "Users can update own mock photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'mock-certificate-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can delete their own mock photos
CREATE POLICY "Users can delete own mock photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mock-certificate-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);