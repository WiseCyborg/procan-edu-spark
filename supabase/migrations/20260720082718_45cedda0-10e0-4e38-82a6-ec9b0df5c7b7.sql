
ALTER TABLE public.video_assets
  ADD COLUMN IF NOT EXISTS draft_audio_url text,
  ADD COLUMN IF NOT EXISTS draft_audio_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_audio_provider text,
  ADD COLUMN IF NOT EXISTS draft_audio_duration_seconds integer;

COMMENT ON COLUMN public.video_assets.draft_audio_url IS
  'Narration audio generated from draft_script. Not published — the live video remains public_url until an admin approves.';

-- RLS policies on storage.objects for video-drafts bucket
CREATE POLICY "video-drafts service role full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'video-drafts')
WITH CHECK (bucket_id = 'video-drafts');

CREATE POLICY "video-drafts admins and coordinators can read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'video-drafts'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'training_coordinator'::app_role)
  )
);
