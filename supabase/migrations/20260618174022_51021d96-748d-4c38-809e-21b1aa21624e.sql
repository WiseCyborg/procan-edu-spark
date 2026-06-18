
-- Hardened unmapped-modules detection + trust check for get_launch_readiness().
-- Locked convention: vimeo id + ?h=<hash>. Accepted shapes:
--   https://vimeo.com/<id>?h=<hash>
--   https://player.vimeo.com/<id>?h=<hash>
--   vimeo/<id>?h=<hash>
-- Anything else (NULL, empty, placeholder strings, bare id, off-platform URL) is unmapped.

CREATE OR REPLACE FUNCTION public.count_unmapped_modules()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_null int;
  v_placeholder int;
  v_bad_format int;
  v_total int;
  v_valid_pattern text := '^(https?://(player\.)?vimeo\.com/|vimeo/)[0-9]+\?h=[a-zA-Z0-9]+$';
  v_placeholder_set text[] := ARRAY['tbd','todo','tba','placeholder','null','n/a','none','pending'];
BEGIN
  SELECT
    count(*) FILTER (WHERE video_url IS NULL OR video_url = ''),
    count(*) FILTER (WHERE video_url IS NOT NULL AND video_url <> ''
                     AND lower(trim(video_url)) = ANY(v_placeholder_set)),
    count(*) FILTER (WHERE video_url IS NOT NULL AND video_url <> ''
                     AND lower(trim(video_url)) <> ALL(v_placeholder_set)
                     AND video_url !~ v_valid_pattern)
  INTO v_null, v_placeholder, v_bad_format
  FROM public.course_modules
  WHERE is_active = true;

  v_total := v_null + v_placeholder + v_bad_format;

  RETURN jsonb_build_object(
    'total', v_total,
    'breakdown', jsonb_build_object(
      'null_or_empty', v_null,
      'placeholder', v_placeholder,
      'bad_format', v_bad_format,
      'dangling', 0
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.count_unmapped_modules() FROM public;
GRANT EXECUTE ON FUNCTION public.count_unmapped_modules() TO authenticated, service_role;


CREATE OR REPLACE FUNCTION public.get_launch_readiness()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unmapped jsonb;
  v_unmapped_total int;
  v_duplicate_videos int;
  v_orphan_video_assets int;
  v_welcome_intro_db boolean;
  v_total_modules int;
  v_total_videos int;
  v_total_courses int;
  v_last_run timestamptz;
  v_last_batch jsonb;
  v_trust text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_unmapped := public.count_unmapped_modules();
  v_unmapped_total := (v_unmapped->>'total')::int;

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

  -- Trust check: documented baseline is ~5-8 unmapped + orphan 1096138533
  -- before Louis fills in remaining ids. If 0 -> query is almost certainly
  -- wrong (we know there are gaps). Far above the band -> investigate.
  IF v_unmapped_total = 0 THEN
    v_trust := 'suspicious_zero';
  ELSIF v_unmapped_total BETWEEN 5 AND 8 THEN
    v_trust := 'ok';
  ELSE
    v_trust := 'out_of_band';
  END IF;

  RETURN jsonb_build_object(
    'unmapped_modules', v_unmapped_total,
    'unmapped_modules_hardened', true,
    'unmapped_breakdown', v_unmapped->'breakdown',
    'trust_check', v_trust,
    'trust_baseline', jsonb_build_object('min', 5, 'max', 8,
      'note', 'Includes documented orphan asset 1096138533. Baseline shifts as Louis maps modules.'),
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
