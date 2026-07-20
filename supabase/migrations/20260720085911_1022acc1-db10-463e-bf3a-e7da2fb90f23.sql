ALTER TABLE public.video_assets
  ADD COLUMN IF NOT EXISTS slide_outline jsonb,
  ADD COLUMN IF NOT EXISTS render_provider text,
  ADD COLUMN IF NOT EXISTS render_job_id text,
  ADD COLUMN IF NOT EXISTS render_status text,
  ADD COLUMN IF NOT EXISTS render_dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS render_error text;

COMMENT ON COLUMN public.video_assets.slide_outline IS
  'On-screen text plan generated from draft_script. Array of {start_seconds, duration_seconds, heading, lines[]}. Used to build the render spec.';
COMMENT ON COLUMN public.video_assets.render_status IS
  'dispatched | rendering | completed | failed. Set by render-video and collect-rendered-video.';