-- Create the compliance storage bucket for storing audit packets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compliance', 
  'compliance', 
  false,
  10485760,
  ARRAY['application/json', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies for organization isolation
-- Policy for reading files - org managers can read their org's files
CREATE POLICY "compliance_bucket_read_org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'compliance'
  AND (storage.foldername(name))[2] = (
    SELECT organization_id::text 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'dispensary_manager', 'training_coordinator')
  )
);

-- Policy for inserting files - org managers can upload to their org's folder
CREATE POLICY "compliance_bucket_insert_org"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'compliance'
  AND (storage.foldername(name))[2] = (
    SELECT organization_id::text 
    FROM profiles 
    WHERE user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'dispensary_manager', 'training_coordinator')
  )
);

-- Policy for deleting files - only admins can delete compliance files
CREATE POLICY "compliance_bucket_delete_admin"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'compliance'
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);