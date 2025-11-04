-- Phase 2: Coordinator Dashboard Functions

-- 1. Function to unassign/deallocate a seat
CREATE OR REPLACE FUNCTION public.unassign_seat(seat_id_param uuid)
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

-- 2. Function to update enrollment deadline
CREATE OR REPLACE FUNCTION public.update_enrollment_deadline(
  user_id_param uuid,
  deadline_date timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.enrollment_deadlines (user_id, deadline, created_at)
  VALUES (user_id_param, deadline_date, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET deadline = deadline_date, updated_at = NOW();
  
  RETURN true;
END;
$$;

-- 3. Function to get organization certificates
CREATE OR REPLACE FUNCTION public.get_organization_certificates(org_id uuid)
RETURNS TABLE(
  certificate_id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email text,
  certificate_number text,
  issued_at timestamptz,
  expiry_date timestamptz,
  is_revoked boolean,
  verification_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as certificate_id,
    c.user_id,
    p.first_name,
    p.last_name,
    au.email,
    c.certificate_number,
    c.issued_at,
    c.expiry_date,
    c.is_revoked,
    COALESCE(
      (SELECT COUNT(*) FROM certificate_verifications WHERE certificate_id = c.id),
      0
    ) as verification_count
  FROM public.certificates c
  JOIN public.profiles p ON p.user_id = c.user_id
  JOIN auth.users au ON au.id = c.user_id
  WHERE p.organization_id = org_id
  ORDER BY c.issued_at DESC;
END;
$$;

-- 4. Function to send bulk reminders
CREATE OR REPLACE FUNCTION public.send_bulk_reminders(
  user_ids uuid[],
  message_template text,
  coordinator_id uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id_item uuid;
  sent_count integer := 0;
BEGIN
  FOREACH user_id_item IN ARRAY user_ids LOOP
    PERFORM queue_job(
      'send_reminder_email',
      jsonb_build_object(
        'user_id', user_id_item,
        'message', message_template,
        'sent_by', coordinator_id
      ),
      'reminder_' || user_id_item::text || '_' || NOW()::text
    );
    sent_count := sent_count + 1;
  END LOOP;
  
  RETURN sent_count;
END;
$$;

-- 5. Create enrollment_deadlines table if not exists
CREATE TABLE IF NOT EXISTS public.enrollment_deadlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline timestamptz NOT NULL,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE public.enrollment_deadlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coordinators can manage deadlines" ON public.enrollment_deadlines;
CREATE POLICY "Coordinators can manage deadlines"
ON public.enrollment_deadlines
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.organization_id IN (
      SELECT p2.organization_id FROM public.profiles p2 WHERE p2.user_id = enrollment_deadlines.user_id
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('training_coordinator', 'dispensary_manager', 'admin')
    )
  )
);