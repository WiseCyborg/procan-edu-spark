-- Create storage bucket for conversation files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'conversation-files', 
  'conversation-files', 
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'text/csv']
);

-- RLS Policy: Participants can upload files to their conversations
CREATE POLICY "Participants can upload conversation files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'conversation-files'
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND (storage.foldername(name))[1] = cp.conversation_id::text
  )
);

-- RLS Policy: Participants can view files in their conversations
CREATE POLICY "Participants can view conversation files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'conversation-files'
  AND EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.user_id = auth.uid()
    AND (storage.foldername(name))[1] = cp.conversation_id::text
  )
);

-- RLS Policy: Participants can delete their own uploaded files
CREATE POLICY "Participants can delete own conversation files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'conversation-files'
  AND owner = auth.uid()
);