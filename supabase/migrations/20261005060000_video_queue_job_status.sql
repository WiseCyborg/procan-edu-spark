-- Keep the original flag date, record a separate last action, and return the
-- latest narration job and the latest render job as two different statuses.
-- Approving a script that is already approved does not rewrite the row and
-- does not queue another narration job.

CREATE OR REPLACE FUNCTION public.approve_video_regeneration(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_caller uuid;
  v_status text;
  v_reviewed_at timestamptz := now();
  v_job_id uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then return jsonb_build_object('ok',false,'error','not_authenticated'); end if;
  if not (has_role(v_caller,'admin'::app_role) or has_role(v_caller,'training_coordinator'::app_role)) then
    return jsonb_build_object('ok',false,'error','not_authorised');
  end if;
  select review_status into v_status from public.video_assets where id = p_asset_id;
  if v_status is null then return jsonb_build_object('ok',false,'error','asset_not_found'); end if;

  if v_status = 'approved' then
    return jsonb_build_object(
      'ok', true,
      'already_approved', true,
      'asset_id', p_asset_id,
      'review_status', 'approved',
      'queued', false
    );
  end if;

  update public.video_assets
     set review_status='approved', reviewed_by=v_caller, reviewed_at=v_reviewed_at,
         needs_regeneration=true, pipeline_stage='script_approved', pipeline_attempts=0,
         pipeline_next_attempt_at=now(), pipeline_last_error=null,
         pipeline_locked_at=null, pipeline_locked_by=null,
         candidate_public_url=null, candidate_r2_key=null,
         r2_verified_at=null, mapping_verified_at=null, playback_verified_at=null,
         verification_metadata='{}'::jsonb, regeneration_notified_at=null, updated_at=now()
   where id=p_asset_id;

  v_job_id := public.queue_job(
    'video_generate_narration',
    jsonb_build_object('asset_id',p_asset_id),
    format('video:%s:narration:%s',p_asset_id,extract(epoch from v_reviewed_at)::bigint),
    null,8
  );

  return jsonb_build_object('ok',true,'asset_id',p_asset_id,'review_status','approved',
    'needs_regeneration',true,'pipeline_stage','script_approved','job_id',v_job_id,'queued',true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.requeue_video_narration(p_asset_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_caller uuid;
  v_status text;
  v_job_id uuid;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return jsonb_build_object('ok', false, 'error', 'not_authenticated');
  end if;
  if not (has_role(v_caller,'admin'::app_role) or has_role(v_caller,'training_coordinator'::app_role)) then
    return jsonb_build_object('ok', false, 'error', 'not_authorised');
  end if;
  if not exists (select 1 from public.video_assets where id = p_asset_id) then
    return jsonb_build_object('ok', false, 'error', 'asset_not_found');
  end if;

  select s.status into v_status
  from public.system_jobs s
  where s.payload->>'asset_id' = p_asset_id::text
    and s.job_type = 'video_generate_narration'
  order by s.queued_at desc
  limit 1;

  if v_status is null then
    return jsonb_build_object('ok', false, 'error', 'no_narration_job');
  end if;
  if v_status <> 'failed' then
    return jsonb_build_object('ok', false, 'error', 'narration_not_failed', 'status', v_status);
  end if;

  -- One new job for this asset. The earlier failed rows, including held ones, stay as they are.
  v_job_id := public.queue_job(
    'video_generate_narration',
    jsonb_build_object('asset_id', p_asset_id),
    format('video:%s:narration:requeue:%s', p_asset_id, extract(epoch from clock_timestamp())::bigint),
    null,
    8
  );

  return jsonb_build_object('ok', true, 'asset_id', p_asset_id, 'job_id', v_job_id, 'queued', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_video_draft_script(p_asset_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_caller uuid;
  v_script text;
begin
  v_caller := auth.uid();
  if v_caller is null then
    return null;
  end if;
  if not (has_role(v_caller,'admin'::app_role) or has_role(v_caller,'training_coordinator'::app_role)) then
    return null;
  end if;
  select draft_script into v_script from public.video_assets where id = p_asset_id;
  return v_script;
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
  playback_verified boolean,
  pipeline_last_error text,
  render_error text,
  job_type text,
  job_status text,
  job_last_error text,
  job_held boolean,
  last_action_at timestamp with time zone,
  narration_status text,
  narration_error text,
  narration_held boolean,
  render_job_status text,
  render_job_error text,
  render_job_held boolean,
  mapped boolean,
  replacement_published boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT v.id, v.asset_key, m.module_number, m.title, c.title,
         v.regeneration_reason,
         COALESCE(v.flagged_at, v.created_at),
         (v.draft_script IS NOT NULL AND btrim(v.draft_script) <> ''),
         v.review_status, m.comar_reference,
         v.pipeline_stage,
         v.render_status,
         (nullif(btrim(coalesce(v.candidate_public_url, '')), '') IS NOT NULL),
         (nullif(btrim(coalesce(v.candidate_r2_key, '')), '') IS NOT NULL),
         (v.playback_verified_at IS NOT NULL),
         v.pipeline_last_error,
         v.render_error,
         j.job_type,
         j.status,
         j.last_error,
         (j.next_retry_at IS NOT NULL AND j.next_retry_at > now() + interval '7 days'),
         (
           SELECT max(ts)
           FROM unnest(ARRAY[
             v.reviewed_at,
             v.draft_generated_at,
             v.r2_verified_at,
             v.mapping_verified_at,
             v.playback_verified_at,
             n.queued_at,
             rj.queued_at
           ]) AS ts
         ),
         n.status,
         n.last_error,
         (n.next_retry_at IS NOT NULL AND n.next_retry_at > now() + interval '7 days'),
         rj.status,
         rj.last_error,
         (rj.next_retry_at IS NOT NULL AND rj.next_retry_at > now() + interval '7 days'),
         (v.mapping_verified_at IS NOT NULL),
         (v.pipeline_stage = 'published' AND v.needs_regeneration IS NOT TRUE)
  FROM video_assets v
  LEFT JOIN course_modules m ON m.id = v.module_id
  LEFT JOIN courses c ON c.id = COALESCE(v.course_id, m.course_id)
  LEFT JOIN LATERAL (
    SELECT s.job_type, s.status, s.last_error, s.next_retry_at
    FROM system_jobs s
    WHERE s.payload->>'asset_id' = v.id::text
      AND s.job_type LIKE 'video%'
    ORDER BY s.queued_at DESC
    LIMIT 1
  ) j ON true
  LEFT JOIN LATERAL (
    SELECT s.status, s.last_error, s.next_retry_at, s.queued_at
    FROM system_jobs s
    WHERE s.payload->>'asset_id' = v.id::text
      AND s.job_type = 'video_generate_narration'
    ORDER BY s.queued_at DESC
    LIMIT 1
  ) n ON true
  LEFT JOIN LATERAL (
    SELECT s.status, s.last_error, s.next_retry_at, s.queued_at
    FROM system_jobs s
    WHERE s.payload->>'asset_id' = v.id::text
      AND s.job_type LIKE 'video_render%'
    ORDER BY s.queued_at DESC
    LIMIT 1
  ) rj ON true
  WHERE (v.needs_regeneration OR v.review_status = 'script_pending_review')
    AND (has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'training_coordinator'::app_role))
  ORDER BY m.module_number NULLS LAST, v.asset_key;
$function$;

REVOKE ALL ON FUNCTION public.approve_video_regeneration(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.requeue_video_narration(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.requeue_video_narration(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_video_draft_script(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_video_draft_script(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_video_regeneration_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_video_regeneration_queue() FROM anon;
GRANT EXECUTE ON FUNCTION public.requeue_video_narration(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_video_draft_script(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_video_regeneration_queue() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
