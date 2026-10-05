-- The regeneration queue and the candidate dialog have to describe the same
-- rule: a blank URL is only valid after the pipeline has already registered a
-- replacement. Collect stores that candidate; this function records a pasted
-- URL only when one is supplied.

CREATE OR REPLACE FUNCTION public.mark_video_regenerated(
  p_asset_id uuid,
  p_new_public_url text DEFAULT NULL::text,
  p_note text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_caller uuid;
  v_exists boolean;
  v_candidate text;
  v_existing text;
  v_stage text;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not (has_role(v_caller,'admin'::app_role) or has_role(v_caller,'training_coordinator'::app_role)) then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;

  select true into v_exists from public.video_assets where id = p_asset_id;
  if v_exists is null then
    return jsonb_build_object('ok', false, 'error', 'asset_not_found');
  end if;

  v_candidate := nullif(btrim(coalesce(p_new_public_url, '')), '');
  if v_candidate is null then
    select nullif(btrim(coalesce(candidate_public_url, '')), ''), pipeline_stage
      into v_existing, v_stage
    from public.video_assets
    where id = p_asset_id;

    if v_existing is null then
      return jsonb_build_object(
        'ok', false,
        'error', 'candidate_url_required',
        'message', 'A video cannot be marked regenerated until a replacement MP4 exists.'
      );
    end if;

    -- The pipeline already stored the candidate. Do not clear R2 verification.
    return jsonb_build_object(
      'ok', true,
      'asset_id', p_asset_id,
      'candidate_registered', true,
      'already_registered', true,
      'published', false,
      'needs_regeneration', true,
      'pipeline_stage', v_stage
    );
  end if;

  update public.video_assets
     set candidate_public_url = v_candidate,
         needs_regeneration = true,
         pipeline_stage = 'render_collected',
         render_status = 'collected',
         r2_verified_at = null,
         mapping_verified_at = null,
         playback_verified_at = null,
         verification_metadata = jsonb_build_object('manual_candidate_note', p_note),
         pipeline_last_error = null,
         pipeline_next_attempt_at = now(),
         updated_at = now()
   where id = p_asset_id;

  return jsonb_build_object(
    'ok', true,
    'asset_id', p_asset_id,
    'candidate_registered', true,
    'published', false,
    'needs_regeneration', true,
    'pipeline_stage', 'render_collected'
  );
end;
$function$;

DROP FUNCTION IF EXISTS public.get_video_regeneration_queue();

CREATE FUNCTION public.get_video_regeneration_queue()
RETURNS TABLE(
  asset_id uuid,
  asset_key text,
  module_number integer,
  module_title text,
  course_title text,
  reason text,
  flagged_since timestamp with time zone,
  has_draft_script boolean,
  review_status text,
  comar_reference text,
  pipeline_stage text,
  render_status text,
  candidate_registered boolean,
  candidate_stored_in_r2 boolean,
  playback_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, v.asset_key, m.module_number, m.title, c.title,
         v.regeneration_reason, v.updated_at,
         (v.draft_script IS NOT NULL AND btrim(v.draft_script) <> ''),
         v.review_status, m.comar_reference,
         v.pipeline_stage,
         v.render_status,
         (nullif(btrim(coalesce(v.candidate_public_url, '')), '') IS NOT NULL),
         (nullif(btrim(coalesce(v.candidate_r2_key, '')), '') IS NOT NULL),
         (v.playback_verified_at IS NOT NULL)
  FROM video_assets v
  LEFT JOIN course_modules m ON m.id = v.module_id
  LEFT JOIN courses c ON c.id = COALESCE(v.course_id, m.course_id)
  WHERE (v.needs_regeneration OR v.review_status = 'script_pending_review')
    AND (has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'training_coordinator'::app_role))
  ORDER BY m.module_number NULLS LAST, v.asset_key;
$function$;

REVOKE ALL ON FUNCTION public.get_video_regeneration_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_video_regeneration_queue() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_video_regeneration_queue() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
