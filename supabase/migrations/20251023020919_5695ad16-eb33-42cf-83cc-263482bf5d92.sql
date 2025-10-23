-- ============================================
-- PHASE 4: FIX STORAGE BUCKET POLICIES
-- ============================================

-- Add missing DELETE policy for profile photos
CREATE POLICY "Users can delete their own photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix existing policies to explicitly specify TO authenticated
DROP POLICY IF EXISTS "Users can upload their own photo" ON storage.objects;
CREATE POLICY "Users can upload their own photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own photo" ON storage.objects;
CREATE POLICY "Users can update their own photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Keep SELECT policy as-is (public bucket, anyone can view)
-- "Anyone can view profile photos" policy already exists