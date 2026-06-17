
-- 1) audit runs table
CREATE TABLE public.launch_audit_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_batch uuid NOT NULL,
  route text NOT NULL,
  url text NOT NULL,
  http_status int,
  status text NOT NULL DEFAULT 'pending',
  screenshot_path text,
  markdown_excerpt text,
  findings jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_launch_audit_runs_batch ON public.launch_audit_runs(run_batch, created_at DESC);
CREATE INDEX idx_launch_audit_runs_created ON public.launch_audit_runs(created_at DESC);

GRANT SELECT ON public.launch_audit_runs TO authenticated;
GRANT ALL ON public.launch_audit_runs TO service_role;

ALTER TABLE public.launch_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit runs"
  ON public.launch_audit_runs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages audit runs"
  ON public.launch_audit_runs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- 2) readiness aggregate RPC (admin-only)
CREATE OR REPLACE FUNCTION public.get_launch_readiness()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unmapped_modules int;
  v_duplicate_videos int;
  v_orphan_video_assets int;
  v_welcome_intro_resolved boolean;
  v_total_modules int;
  v_total_videos int;
  v_total_courses int;
  v_last_run timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_unmapped_modules
  FROM public.course_modules cm
  WHERE cm.is_active = true
    AND (cm.video_url IS NULL OR cm.video_url = '');

  SELECT count(*) INTO v_duplicate_videos
  FROM (
    SELECT video_url FROM public.course_modules
    WHERE video_url IS NOT NULL AND video_url <> '' AND is_active = true
    GROUP BY video_url HAVING count(*) > 1
  ) d;

  SELECT count(*) INTO v_orphan_video_assets
  FROM public.video_assets va
  WHERE va.is_active = true
    AND va.module_id IS NULL;

  SELECT EXISTS(
    SELECT 1 FROM public.video_assets
    WHERE asset_key = 'welcome-intro' AND is_active = true
      AND (storage_path IS NOT NULL OR public_url IS NOT NULL)
  ) INTO v_welcome_intro_resolved;

  SELECT count(*) INTO v_total_modules FROM public.course_modules WHERE is_active = true;
  SELECT count(*) INTO v_total_videos FROM public.video_assets WHERE is_active = true;
  SELECT count(*) INTO v_total_courses FROM public.courses WHERE is_active = true;

  SELECT max(created_at) INTO v_last_run FROM public.launch_audit_runs;

  RETURN jsonb_build_object(
    'unmapped_modules', v_unmapped_modules,
    'duplicate_videos', v_duplicate_videos,
    'orphan_video_assets', v_orphan_video_assets,
    'welcome_intro_resolved', v_welcome_intro_resolved,
    'total_active_modules', v_total_modules,
    'total_active_videos', v_total_videos,
    'total_active_courses', v_total_courses,
    'last_audit_run_at', v_last_run,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_launch_readiness() FROM public;
GRANT EXECUTE ON FUNCTION public.get_launch_readiness() TO authenticated, service_role;
