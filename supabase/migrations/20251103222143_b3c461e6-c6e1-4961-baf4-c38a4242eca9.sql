-- Gate 7: Create deallocate_seat RPC for rollback
CREATE OR REPLACE FUNCTION deallocate_seat(seat_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.rvt_seats
  SET 
    status = 'available',
    assigned_user_id = NULL,
    assigned_at = NULL
  WHERE id = seat_id_param;
  
  RETURN FOUND;
END;
$$;

-- Gate 10: Add metadata column to certificates for failure tracking
ALTER TABLE public.certificates 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Gate 9: Add metadata column to exam_attempts for camera bypass tracking
ALTER TABLE public.exam_attempts 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;