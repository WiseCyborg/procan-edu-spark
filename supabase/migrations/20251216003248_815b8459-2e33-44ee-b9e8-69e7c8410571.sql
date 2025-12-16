-- Create get_approved_organizations RPC function
CREATE OR REPLACE FUNCTION public.get_approved_organizations()
RETURNS TABLE (
  org_id uuid,
  organization_name text,
  license_number text,
  dispensary_number text,
  manager_name text,
  manager_email text,
  manager_registered boolean,
  total_seats integer,
  used_seats integer,
  available_seats integer,
  employee_count bigint,
  certified_count bigint,
  join_code text,
  payment_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS org_id,
    o.name AS organization_name,
    o.license_number,
    o.dispensary_number,
    COALESCE(da.contact_person, p.full_name, 'Not assigned') AS manager_name,
    COALESCE(da.contact_email, p.email_cache, '') AS manager_email,
    CASE WHEN p.id IS NOT NULL THEN true ELSE false END AS manager_registered,
    COALESCE((
      SELECT COUNT(*)::integer FROM rvt_seats s WHERE s.organization_id = o.id
    ), 0) AS total_seats,
    COALESCE((
      SELECT COUNT(*)::integer FROM rvt_seats s 
      WHERE s.organization_id = o.id AND s.status IN ('assigned', 'used')
    ), 0) AS used_seats,
    COALESCE((
      SELECT COUNT(*)::integer FROM rvt_seats s 
      WHERE s.organization_id = o.id AND s.status = 'available'
    ), 0) AS available_seats,
    COALESCE((
      SELECT COUNT(*) FROM profiles emp 
      WHERE emp.organization_id = o.id 
      AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = emp.user_id AND ur.role = 'student')
    ), 0) AS employee_count,
    COALESCE((
      SELECT COUNT(*) FROM certificates c 
      WHERE c.user_id IN (SELECT emp.user_id FROM profiles emp WHERE emp.organization_id = o.id)
      AND c.is_revoked = false
    ), 0) AS certified_count,
    COALESCE((
      SELECT jc.code FROM join_codes jc 
      WHERE jc.organization_id = o.id AND jc.is_active = true 
      ORDER BY jc.created_at DESC LIMIT 1
    ), '') AS join_code,
    COALESCE(o.payment_status, 'approved') AS payment_status
  FROM organizations o
  LEFT JOIN dispensary_applications da ON da.organization_id = o.id AND da.application_status = 'approved'
  LEFT JOIN profiles p ON p.organization_id = o.id 
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'dispensary_manager')
  WHERE o.is_approved = true
  ORDER BY o.name;
END;
$$;

-- Create suspend_organization function
CREATE OR REPLACE FUNCTION public.suspend_organization(
  p_org_id uuid,
  p_reason text DEFAULT 'Suspended by admin'
)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin role required'::text;
    RETURN;
  END IF;

  -- Check org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT false, 'Organization not found'::text;
    RETURN;
  END IF;

  -- Update organization status
  UPDATE organizations 
  SET 
    is_approved = false,
    payment_status = 'suspended',
    updated_at = now()
  WHERE id = p_org_id;

  -- Log the action
  INSERT INTO api_console_audit (
    command, api_route, user_id, user_role, success, request_params
  ) VALUES (
    'suspend_organization', 
    'rpc/suspend_organization', 
    auth.uid(), 
    'admin', 
    true, 
    jsonb_build_object('org_id', p_org_id, 'reason', p_reason)
  );

  RETURN QUERY SELECT true, 'Organization suspended successfully'::text;
END;
$$;

-- Create reactivate_organization function
CREATE OR REPLACE FUNCTION public.reactivate_organization(p_org_id uuid)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin role required'::text;
    RETURN;
  END IF;

  -- Check org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT false, 'Organization not found'::text;
    RETURN;
  END IF;

  -- Update organization status
  UPDATE organizations 
  SET 
    is_approved = true,
    payment_status = 'active',
    updated_at = now()
  WHERE id = p_org_id;

  RETURN QUERY SELECT true, 'Organization reactivated successfully'::text;
END;
$$;

-- Create delete_dispensary_application function
CREATE OR REPLACE FUNCTION public.delete_dispensary_application(p_application_id uuid)
RETURNS TABLE (success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app_status text;
  v_org_id uuid;
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT false, 'Unauthorized: Admin role required'::text;
    RETURN;
  END IF;

  -- Get application details
  SELECT application_status, organization_id INTO v_app_status, v_org_id
  FROM dispensary_applications 
  WHERE id = p_application_id;

  IF v_app_status IS NULL THEN
    RETURN QUERY SELECT false, 'Application not found'::text;
    RETURN;
  END IF;

  -- If application has org, warn but still delete
  IF v_org_id IS NOT NULL THEN
    -- Don't delete the org, just unlink
    UPDATE dispensary_applications SET organization_id = NULL WHERE id = p_application_id;
  END IF;

  -- Delete the application
  DELETE FROM dispensary_applications WHERE id = p_application_id;

  -- Log the action
  INSERT INTO api_console_audit (
    command, api_route, user_id, user_role, success, request_params
  ) VALUES (
    'delete_dispensary_application', 
    'rpc/delete_dispensary_application', 
    auth.uid(), 
    'admin', 
    true, 
    jsonb_build_object('application_id', p_application_id, 'previous_status', v_app_status)
  );

  RETURN QUERY SELECT true, 'Application deleted successfully'::text;
END;
$$;