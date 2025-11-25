-- Fix validate_join_code_has_seats to work without course_id column
CREATE OR REPLACE FUNCTION public.validate_join_code_has_seats(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_join_code RECORD;
  v_available_seats INTEGER;
BEGIN
  -- Get join code details (no course_id in rvt_join_codes table)
  SELECT 
    jc.id,
    jc.organization_id,
    jc.max_uses,
    jc.current_uses,
    jc.expires_at,
    jc.is_active
  INTO v_join_code
  FROM public.rvt_join_codes jc
  WHERE jc.code = _code
    AND jc.is_active = true
    AND (jc.expires_at IS NULL OR jc.expires_at > NOW());
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if code has uses remaining
  IF v_join_code.max_uses IS NOT NULL 
     AND v_join_code.current_uses >= v_join_code.max_uses THEN
    RETURN false;
  END IF;
  
  -- Check available seats for this organization (any course)
  SELECT COUNT(*) INTO v_available_seats
  FROM public.rvt_seats
  WHERE organization_id = v_join_code.organization_id
    AND status = 'available';
  
  RETURN v_available_seats > 0;
END;
$function$;