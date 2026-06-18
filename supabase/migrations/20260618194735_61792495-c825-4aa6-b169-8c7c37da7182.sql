
-- Step 5: schema + RPC updates + asset back-fill for E2E reconciliation.

-- 1. Accepted-exclusion column
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS unmapped_reason text;
COMMENT ON COLUMN public.course_modules.unmapped_reason IS
  'When non-NULL, this module is intentionally excluded from the unmapped-modules count. Free-text reason code (e.g. awaiting_correct_vimeo_id_2026-06-17, storage_hosted_orientation, consumer_course_text_only).';

-- 2a. Seed the 6 intentionally-unmapped RVT modules (from video_mapping_correction_2026-06-17.md)
UPDATE public.course_modules SET unmapped_reason = 'awaiting_correct_vimeo_id_2026-06-17'
WHERE id IN (
  '3b7d23c0-c7d9-48ea-ac75-17e515e6304a', -- mod 2 Patient Rights and Privacy
  '14d0aa9f-4436-460c-a76b-52f07ba33bf3', -- mod 4 Inventory Management and Tracking
  'b49e8150-f795-4d6f-a501-35d5e1f5aacf', -- mod 9 Point of Sale Systems and Transactions
  'f2eaecb3-603b-4f9e-90ea-254f57774b8f', -- mod 11 Cannabis Cultivation Basics
  'b8d16c7f-10e6-40d5-b766-721839038f5e', -- mod 14 Age Verification and ID Checking
  'ec62fe97-9a99-4cec-b25c-7ecbedebbd55'  -- mod 19 Supervising Compliance Operations
);

-- 2b. Orientation: accept Supabase-storage URL as permanent exception (Q1 default)
UPDATE public.course_modules SET unmapped_reason = 'storage_hosted_orientation'
WHERE id = 'f543fad9-fb96-485c-9ca0-980564acc559';

-- 2c. Consumer-track modules with no video curriculum (Q2 default)
UPDATE public.course_modules SET unmapped_reason = 'consumer_course_text_only'
WHERE is_active = true
  AND (video_url IS NULL OR video_url = '')
  AND course_id IN (
    SELECT id FROM public.courses
    WHERE title IN ('Cannabis 101 for Consumers', 'First Time at a Dispensary', 'Maryland Cannabis Laws')
  );

-- 3. Hardened count function now excludes rows with unmapped_reason
CREATE OR REPLACE FUNCTION public.count_unmapped_modules()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_null int; v_placeholder int; v_bad_format int; v_total int;
  v_excl_null int; v_excl_placeholder int; v_excl_bad_format int; v_excl_total int;
  v_valid_pattern text := '^(https?://(player\.)?vimeo\.com/|vimeo/)[0-9]+\?h=[a-zA-Z0-9]+$';
  v_placeholder_set text[] := ARRAY['tbd','todo','tba','placeholder','null','n/a','none','pending'];
BEGIN
  -- Active "unmapped" rows split into (a) accepted_exclusions and (b) real outstanding.
  SELECT
    count(*) FILTER (WHERE (video_url IS NULL OR video_url = '') AND unmapped_reason IS NULL),
    count(*) FILTER (WHERE video_url IS NOT NULL AND video_url <> ''
                     AND lower(trim(video_url)) = ANY(v_placeholder_set)
                     AND unmapped_reason IS NULL),
    count(*) FILTER (WHERE video_url IS NOT NULL AND video_url <> ''
                     AND lower(trim(video_url)) <> ALL(v_placeholder_set)
                     AND video_url !~ v_valid_pattern
                     AND unmapped_reason IS NULL),
    count(*) FILTER (WHERE (video_url IS NULL OR video_url = '') AND unmapped_reason IS NOT NULL),
    count(*) FILTER (WHERE video_url IS NOT NULL AND video_url <> ''
                     AND lower(trim(video_url)) = ANY(v_placeholder_set)
                     AND unmapped_reason IS NOT NULL),
    count(*) FILTER (WHERE video_url IS NOT NULL AND video_url <> ''
                     AND lower(trim(video_url)) <> ALL(v_placeholder_set)
                     AND video_url !~ v_valid_pattern
                     AND unmapped_reason IS NOT NULL)
  INTO v_null, v_placeholder, v_bad_format,
       v_excl_null, v_excl_placeholder, v_excl_bad_format
  FROM public.course_modules WHERE is_active = true;

  v_total := v_null + v_placeholder + v_bad_format;
  v_excl_total := v_excl_null + v_excl_placeholder + v_excl_bad_format;

  RETURN jsonb_build_object(
    'total', v_total,
    'breakdown', jsonb_build_object(
      'null_or_empty', v_null,
      'placeholder', v_placeholder,
      'bad_format', v_bad_format,
      'dangling', 0
    ),
    'accepted_exclusions', v_excl_total,
    'exclusions_breakdown', jsonb_build_object(
      'null_or_empty', v_excl_null,
      'placeholder', v_excl_placeholder,
      'bad_format', v_excl_bad_format
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.count_unmapped_modules() FROM public;
GRANT EXECUTE ON FUNCTION public.count_unmapped_modules() TO authenticated, service_role;

-- 4. Readiness RPC: expose exclusions + tighten trust band to [0,2]
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
  v_excl_total int;
  v_duplicate_videos int;
  v_orphan_video_assets int;
  v_welcome_intro_db boolean;
  v_total_modules int;
  v_total_videos int;
  v_total_courses int;
  v_last_run timestamptz;
  v_last_batch jsonb;
  v_trust text;
  v_exclusion_rows jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_unmapped := public.count_unmapped_modules();
  v_unmapped_total := (v_unmapped->>'total')::int;
  v_excl_total := COALESCE((v_unmapped->>'accepted_exclusions')::int, 0);

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
    ORDER BY started_at DESC LIMIT 1
  ) s;

  -- Tightened: real unresolved unmapped count should be 0-2. Exclusions are documented separately.
  IF v_unmapped_total = 0 AND v_excl_total = 0 THEN
    v_trust := 'suspicious_zero';
  ELSIF v_unmapped_total <= 2 THEN
    v_trust := 'ok';
  ELSE
    v_trust := 'out_of_band';
  END IF;

  -- List of accepted-exclusion rows for the evidence file
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', cm.id, 'title', cm.title, 'course', c.title,
    'module_number', cm.module_number, 'reason', cm.unmapped_reason,
    'video_url', cm.video_url
  ) ORDER BY c.title, cm.module_number), '[]'::jsonb)
  INTO v_exclusion_rows
  FROM public.course_modules cm
  LEFT JOIN public.courses c ON c.id = cm.course_id
  WHERE cm.is_active AND cm.unmapped_reason IS NOT NULL;

  RETURN jsonb_build_object(
    'unmapped_modules', v_unmapped_total,
    'unmapped_modules_hardened', true,
    'unmapped_breakdown', v_unmapped->'breakdown',
    'accepted_exclusions', v_excl_total,
    'exclusions_breakdown', v_unmapped->'exclusions_breakdown',
    'exclusion_rows', v_exclusion_rows,
    'trust_check', v_trust,
    'trust_baseline', jsonb_build_object('min', 0, 'max', 2,
      'note', 'Real outstanding unmapped count. Accepted exclusions (intentional gaps) are reported separately.'),
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

-- 5. Back-fill video_assets.module_id by joining on the Vimeo id embedded in
-- storage_path ("vimeo/<id>") and the RVT module's video_url.
WITH va_keyed AS (
  SELECT id, substring(storage_path FROM '^vimeo/([0-9]+)$') AS vimeo_id
  FROM public.video_assets
  WHERE module_id IS NULL AND storage_path ~ '^vimeo/[0-9]+$'
),
cm_keyed AS (
  SELECT id AS module_id, course_id,
         substring(video_url FROM '(?:vimeo\.com/|vimeo/)([0-9]+)') AS vimeo_id
  FROM public.course_modules
  WHERE is_active = true AND video_url ~ '(?:vimeo\.com/|vimeo/)[0-9]+'
)
UPDATE public.video_assets va
SET module_id = cm.module_id,
    course_id = cm.course_id,
    updated_at = now()
FROM va_keyed vk
JOIN cm_keyed cm ON cm.vimeo_id = vk.vimeo_id
WHERE va.id = vk.id;
