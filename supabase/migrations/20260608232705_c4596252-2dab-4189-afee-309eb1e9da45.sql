
ALTER TABLE public.video_assets
  ADD COLUMN IF NOT EXISTS course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS access_level text NOT NULL DEFAULT 'enrolled',
  ADD COLUMN IF NOT EXISTS bucket_id text NOT NULL DEFAULT 'training-videos',
  ADD COLUMN IF NOT EXISTS mime_type text NOT NULL DEFAULT 'video/mp4';

ALTER TABLE public.video_assets ALTER COLUMN public_url DROP NOT NULL;
ALTER TABLE public.video_assets ALTER COLUMN storage_path DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_assets_access_level_chk') THEN
    ALTER TABLE public.video_assets
      ADD CONSTRAINT video_assets_access_level_chk
      CHECK (access_level IN ('public','authenticated','enrolled'));
  END IF;
END $$;

-- Read policy: authenticated users can read metadata of active rows
DROP POLICY IF EXISTS "video_assets_read_active" ON public.video_assets;
CREATE POLICY "video_assets_read_active"
  ON public.video_assets FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Seed welcome video metadata row (no storage_path yet)
INSERT INTO public.video_assets (asset_key, title, description, access_level, course_id, bucket_id, is_active)
VALUES ('welcome-intro', 'Welcome to ProCann Edu', 'Short introduction to your RVT training journey.', 'authenticated', NULL, 'training-videos', true)
ON CONFLICT (asset_key) DO NOTHING;
