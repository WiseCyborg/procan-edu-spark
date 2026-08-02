-- Workstream A: R2 migration tracking columns on video_assets.
-- Adds provider/target/status bookkeeping plus a reversible pointer to the
-- pre-migration Supabase Storage location.

ALTER TABLE public.video_assets
  ADD COLUMN IF NOT EXISTS storage_provider   text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS r2_key             text,
  ADD COLUMN IF NOT EXISTS migrated_at        timestamptz,
  ADD COLUMN IF NOT EXISTS migration_status   text,
  ADD COLUMN IF NOT EXISTS migration_error    text,
  ADD COLUMN IF NOT EXISTS legacy_storage_path text,
  ADD COLUMN IF NOT EXISTS legacy_bucket_id    text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'video_assets_storage_provider_check'
  ) THEN
    ALTER TABLE public.video_assets
      ADD CONSTRAINT video_assets_storage_provider_check
      CHECK (storage_provider IN ('supabase', 'r2', 'vimeo'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'video_assets_migration_status_check'
  ) THEN
    ALTER TABLE public.video_assets
      ADD CONSTRAINT video_assets_migration_status_check
      CHECK (migration_status IS NULL OR migration_status IN ('pending','in_progress','done','failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS video_assets_migration_status_idx
  ON public.video_assets (migration_status)
  WHERE migration_status IS NOT NULL;

COMMENT ON COLUMN public.video_assets.storage_provider IS 'Where the primary object lives: supabase | r2 | vimeo';
COMMENT ON COLUMN public.video_assets.r2_key IS 'Canonical R2 object key ({course_slug}_module_NN_{slug}.mp4)';
COMMENT ON COLUMN public.video_assets.legacy_storage_path IS 'Pre-migration storage_path, retained so a bad run is reversible';
COMMENT ON COLUMN public.video_assets.legacy_bucket_id IS 'Pre-migration bucket_id, retained so a bad run is reversible';
