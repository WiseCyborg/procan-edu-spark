-- Dates in phrases such as "pre-2026-08-07" name a record that does not exist.
-- They are not the original flag date.

UPDATE public.video_assets v
   SET flagged_at = COALESCE(
     (
       SELECT min(found[1]::date)::timestamptz
       FROM regexp_matches(
         coalesce(v.regeneration_reason, ''),
         '(?<!pre-)(20[0-9]{2}-[0-9]{2}-[0-9]{2})',
         'g'
       ) AS found
     ),
     v.created_at
   )
 WHERE v.needs_regeneration IS TRUE;
