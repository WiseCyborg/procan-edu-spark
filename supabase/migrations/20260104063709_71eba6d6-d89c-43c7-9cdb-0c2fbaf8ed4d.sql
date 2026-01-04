-- ================================================
-- Multi-Role Hardening for UAT
-- Prevents duplicate key errors when same email tests both Admin + Employee
-- ================================================

-- 1. Add unique constraint to prevent double seat assignment per org
-- (user can only have one active seat per organization)
CREATE UNIQUE INDEX IF NOT EXISTS rvt_seats_user_org_active_unique 
ON public.rvt_seats (assigned_user_id, organization_id) 
WHERE assigned_user_id IS NOT NULL AND status IN ('assigned', 'available');

-- 2. Create safe role assignment function (never downgrades)
CREATE OR REPLACE FUNCTION public.safe_assign_role(
  p_user_id UUID,
  p_role app_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_priority INTEGER;
  v_existing_max_priority INTEGER;
BEGIN
  -- Define role priorities (higher = more privileged)
  -- admin: 100, dispensary_manager: 80, training_coordinator: 70, trainer: 60, student: 10
  v_role_priority := CASE p_role
    WHEN 'admin' THEN 100
    WHEN 'dispensary_manager' THEN 80
    WHEN 'training_coordinator' THEN 70
    WHEN 'trainer' THEN 60
    WHEN 'student' THEN 10
    ELSE 0
  END;
  
  -- Get highest existing role priority for user
  SELECT MAX(CASE role
    WHEN 'admin' THEN 100
    WHEN 'dispensary_manager' THEN 80
    WHEN 'training_coordinator' THEN 70
    WHEN 'trainer' THEN 60
    WHEN 'student' THEN 10
    ELSE 0
  END) INTO v_existing_max_priority
  FROM user_roles
  WHERE user_id = p_user_id;
  
  -- Insert role if doesn't exist (multi-role support)
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, p_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$$;

-- 3. Create idempotent seat assignment function
CREATE OR REPLACE FUNCTION public.safe_assign_seat_to_user(
  p_user_id UUID,
  p_organization_id UUID,
  p_course_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat_id UUID;
  v_course_id UUID;
BEGIN
  -- Get default course if not specified
  v_course_id := COALESCE(p_course_id, (
    SELECT id FROM courses WHERE is_active = true LIMIT 1
  ));
  
  -- Check if user already has an assigned seat in this org
  SELECT id INTO v_seat_id
  FROM rvt_seats
  WHERE assigned_user_id = p_user_id
    AND organization_id = p_organization_id
    AND status IN ('assigned', 'used')
  LIMIT 1;
  
  -- If already assigned, return existing seat
  IF v_seat_id IS NOT NULL THEN
    RETURN v_seat_id;
  END IF;
  
  -- Find and claim an available seat atomically
  UPDATE rvt_seats
  SET 
    assigned_user_id = p_user_id,
    status = 'assigned',
    assigned_at = NOW()
  WHERE id = (
    SELECT id FROM rvt_seats
    WHERE organization_id = p_organization_id
      AND course_id = v_course_id
      AND status = 'available'
      AND assigned_user_id IS NULL
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING id INTO v_seat_id;
  
  RETURN v_seat_id;
END;
$$;

-- 4. Create helper to check if user has any management role
CREATE OR REPLACE FUNCTION public.has_management_role(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id
      AND role IN ('admin', 'dispensary_manager', 'training_coordinator')
  );
$$;

-- 5. Add helper to get user's highest role
CREATE OR REPLACE FUNCTION public.get_highest_role(p_user_id UUID)
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT role INTO v_role
  FROM user_roles
  WHERE user_id = p_user_id
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'dispensary_manager' THEN 2
    WHEN 'training_coordinator' THEN 3
    WHEN 'trainer' THEN 4
    WHEN 'student' THEN 5
    ELSE 6
  END
  LIMIT 1;
  
  RETURN v_role;
END;
$$;