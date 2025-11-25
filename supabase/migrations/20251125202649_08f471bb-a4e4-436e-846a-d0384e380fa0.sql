-- Fix allocate_seat_to_user to not require valid user_id upfront
-- This prevents foreign key violations when using placeholder IDs

CREATE OR REPLACE FUNCTION public.allocate_seat_to_user(org_id uuid, user_id uuid, course_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  allocated_seat_id uuid;
  v_org_id ALIAS FOR org_id;
  v_user_id ALIAS FOR user_id;
  v_course_id ALIAS FOR course_id;
BEGIN
  -- Atomically claim an available seat using FOR UPDATE SKIP LOCKED
  SELECT rs.id INTO allocated_seat_id
  FROM public.rvt_seats rs
  WHERE rs.organization_id = v_org_id
    AND rs.course_id = v_course_id
    AND rs.status = 'available'
  ORDER BY rs.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF allocated_seat_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update the seat to mark it as assigned (but don't set user_id yet to avoid FK violation)
  -- The calling function will update assigned_user_id after creating the user
  UPDATE public.rvt_seats
  SET 
    status = 'assigned',
    assigned_at = NOW()
  WHERE id = allocated_seat_id;
  
  RETURN allocated_seat_id;
END;
$function$;