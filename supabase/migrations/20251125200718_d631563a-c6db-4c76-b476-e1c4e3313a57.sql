-- Fix allocate_seat_to_user function - remove ambiguous column reference
CREATE OR REPLACE FUNCTION public.allocate_seat_to_user(
  org_id uuid,
  user_id uuid,
  course_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  allocated_seat_id uuid;
BEGIN
  -- Atomically claim an available seat using FOR UPDATE SKIP LOCKED
  SELECT rs.id INTO allocated_seat_id
  FROM public.rvt_seats rs
  WHERE rs.organization_id = org_id
    AND rs.course_id = course_id
    AND rs.status = 'available'
  ORDER BY rs.created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF allocated_seat_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Update the seat to mark it as assigned
  UPDATE public.rvt_seats
  SET 
    status = 'assigned',
    assigned_user_id = user_id,
    assigned_at = NOW()
  WHERE id = allocated_seat_id;
  
  RETURN allocated_seat_id;
END;
$function$;