ALTER TABLE public.video_assets ADD COLUMN IF NOT EXISTS fallback_storage_path text;
ALTER TABLE public.video_assets ADD COLUMN IF NOT EXISTS fallback_bucket_id text;