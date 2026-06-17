
-- 1) Rollup columns on existing audit runs table
ALTER TABLE public.launch_audit_runs
  ADD COLUMN IF NOT EXISTS rollup_status text,
  ADD COLUMN IF NOT EXISTS failed_checks jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_launch_audit_runs_rollup
  ON public.launch_audit_runs(run_batch, rollup_status);

-- 2) Batch summary view — pass/warn/fail counts + welcome-intro probe
CREATE OR REPLACE VIEW public.launch_audit_batch_summary AS
SELECT
  r.run_batch,
  min(r.created_at) AS started_at,
  max(r.created_at) AS ended_at,
  count(*) FILTER (WHERE r.route <> '__welcome_intro__') AS total_routes,
  count(*) FILTER (WHERE r.route <> '__welcome_intro__' AND r.rollup_status = 'pass') AS pass_count,
  count(*) FILTER (WHERE r.route <> '__welcome_intro__' AND r.rollup_status = 'warn') AS warn_count,
  count(*) FILTER (WHERE r.route <> '__welcome_intro__' AND r.rollup_status = 'fail') AS fail_count,
  CASE
    WHEN count(*) FILTER (WHERE r.route <> '__welcome_intro__' AND r.rollup_status = 'fail') > 0 THEN 'fail'
    WHEN count(*) FILTER (WHERE r.route <> '__welcome_intro__' AND r.rollup_status = 'warn') > 0 THEN 'warn'
    WHEN count(*) FILTER (WHERE r.route <> '__welcome_intro__' AND r.rollup_status = 'pass') > 0 THEN 'pass'
    ELSE 'unknown'
  END AS rollup_status,
  (
    SELECT wi.findings
    FROM public.launch_audit_runs wi
    WHERE wi.run_batch = r.run_batch AND wi.route = '__welcome_intro__'
    ORDER BY wi.created_at DESC
    LIMIT 1
  ) AS welcome_intro_probe
FROM public.launch_audit_runs r
GROUP BY r.run_batch;

GRANT SELECT ON public.launch_audit_batch_summary TO authenticated, service_role;

-- 3) Updated readiness RPC — adds last_batch_rollup + welcome_intro_probe
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
  v_welcome_intro_db boolean;
  v_total_modules int;
  v_total_videos int;
  v_total_courses int;
  v_last_run timestamptz;
  v_last_batch jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- NOTE: unmapped_modules logic still NULL/empty only.
  -- Hardened format/placeholder validation deferred pending Louis's
  -- video_url storage convention.
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
  WHERE va.is_active = true AND va.module_id IS NULL;

  SELECT EXISTS(
    SELECT 1 FROM public.video_assets
    WHERE asset_key = 'welcome-intro' AND is_active = true
      AND (storage_path IS NOT NULL OR public_url IS NOT NULL)
  ) INTO v_welcome_intro_db;

  SELECT count(*) INTO v_total_modules FROM public.course_modules WHERE is_active = true;
  SELECT count(*) INTO v_total_videos FROM public.video_assets WHERE is_active = true;
  SELECT count(*) INTO v_total_courses FROM public.courses WHERE is_active = true;

  SELECT max(created_at) INTO v_last_run FROM public.launch_audit_runs;

  SELECT to_jsonb(s) INTO v_last_batch
  FROM (
    SELECT run_batch, started_at, ended_at, total_routes,
           pass_count, warn_count, fail_count, rollup_status, welcome_intro_probe
    FROM public.launch_audit_batch_summary
    ORDER BY started_at DESC
    LIMIT 1
  ) s;

  RETURN jsonb_build_object(
    'unmapped_modules', v_unmapped_modules,
    'unmapped_modules_hardened', false,
    'duplicate_videos', v_duplicate_videos,
    'orphan_video_assets', v_orphan_video_assets,
    'welcome_intro_db_row_present', v_welcome_intro_db,
    'welcome_intro_resolved', COALESCE(
      v_welcome_intro_db AND ((v_last_batch->'welcome_intro_probe'->>'ok')::boolean),
      false
    ),
    'welcome_intro_probe', v_last_batch->'welcome_intro_probe',
    'last_batch', v_last_batch,
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
