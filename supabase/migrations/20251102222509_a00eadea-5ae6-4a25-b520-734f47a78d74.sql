-- Drop the old 2-parameter version to fix PGRST203 overload error
DROP FUNCTION IF EXISTS public.approve_dispensary_application(uuid, integer);

-- Update create_initial_seats_for_organization to use correct columns
CREATE OR REPLACE FUNCTION public.create_initial_seats_for_organization(
  org_id uuid, 
  quantity integer DEFAULT 10, 
  purchased_by_id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  purchase_id UUID;
  default_course_id UUID;
  i INTEGER;
BEGIN
  -- Get active course
  SELECT id INTO default_course_id
  FROM public.courses
  WHERE is_active = true
  LIMIT 1;

  IF default_course_id IS NULL THEN
    RAISE EXCEPTION 'No active course found - cannot create seats';
  END IF;

  -- Create purchase record using EXISTING columns only
  INSERT INTO public.rvt_purchases (
    organization_id,
    quantity,
    amount_paid,
    currency,
    payment_method,
    status,
    idempotency_key,
    metadata
  ) VALUES (
    org_id,
    quantity,
    0,
    'USD',
    'initial_allocation',
    'completed',
    'INITIAL-' || org_id::TEXT,
    jsonb_build_object(
      'purchased_by', purchased_by_id,
      'allocation_type', 'initial',
      'created_by', 'system'
    )
  ) RETURNING id INTO purchase_id;

  -- Create seats
  FOR i IN 1..quantity LOOP
    INSERT INTO public.rvt_seats (
      purchase_id,
      organization_id,
      course_id,
      status
    ) VALUES (
      purchase_id,
      org_id,
      default_course_id,
      'available'
    );
  END LOOP;

  RETURN purchase_id;
END;
$function$;