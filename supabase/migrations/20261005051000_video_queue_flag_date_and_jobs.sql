-- Keep the date a video was flagged, instead of video_assets.updated_at, which
-- moves on every later write. The queue also returns the latest video job so
-- the admin page can show live status and errors.

ALTER TABLE public.video_assets
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz;

CREATE OR REPLACE FUNCTION public.video_assets_set_flagged_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.needs_regeneration IS TRUE
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.needs_regeneration, false) IS NOT TRUE)
     AND NEW.flagged_at IS NULL THEN
    NEW.flagged_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS video_assets_set_flagged_at ON public.video_assets;
CREATE TRIGGER video_assets_set_flagged_at
  BEFORE INSERT OR UPDATE ON public.video_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.video_assets_set_flagged_at();

-- Earliest date written into the regeneration reason. That is the original
-- flag, and it is not replaced when the row is touched later.
UPDATE public.video_assets v
   SET flagged_at = COALESCE(
     (
       SELECT min(found[1]::date)::timestamptz
       FROM regexp_matches(coalesce(v.regeneration_reason, ''), '(20[0-9]{2}-[0-9]{2}-[0-9]{2})', 'g') AS found
     ),
     v.created_at
   )
 WHERE v.needs_regeneration IS TRUE
   AND v.flagged_at IS NULL;

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
  job_held boolean
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
         (j.next_retry_at IS NOT NULL AND j.next_retry_at > now() + interval '7 days')
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
  WHERE (v.needs_regeneration OR v.review_status = 'script_pending_review')
    AND (has_role(auth.uid(),'admin'::app_role)
      OR has_role(auth.uid(),'training_coordinator'::app_role))
  ORDER BY m.module_number NULLS LAST, v.asset_key;
$function$;

REVOKE ALL ON FUNCTION public.get_video_regeneration_queue() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_video_regeneration_queue() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_video_regeneration_queue() TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
