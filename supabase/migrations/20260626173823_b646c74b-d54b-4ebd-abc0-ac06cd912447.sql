
-- Learner can read their own certificate PDF (path starts with their user_id)
CREATE POLICY "Learners read own certificate pdf"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can read any certificate
CREATE POLICY "Admins read all certificate pdfs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'certificates'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);
