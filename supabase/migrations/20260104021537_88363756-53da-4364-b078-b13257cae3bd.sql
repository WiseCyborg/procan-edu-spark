
-- Drop and recreate function with new return type
DROP FUNCTION IF EXISTS public.get_approved_organizations();

CREATE OR REPLACE FUNCTION public.get_approved_organizations()
 RETURNS TABLE(
   org_id uuid, 
   organization_name text, 
   license_number text, 
   dispensary_number text, 
   manager_name text, 
   manager_email text, 
   manager_registered boolean, 
   registration_token_expires_at timestamptz,
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
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    o.id AS org_id,
    o.name AS organization_name,
    o.license_number,
    COALESCE(da.dispensary_number, '') AS dispensary_number,
    COALESCE(
      da.contact_person, 
      CONCAT(p.first_name, ' ', p.last_name),
      o.contact_person, 
      'Not assigned'
    ) AS manager_name,
    COALESCE(da.contact_email, p.email_cache, o.contact_email, '') AS manager_email,
    CASE WHEN p.id IS NOT NULL THEN true ELSE false END AS manager_registered,
    da.registration_token_expires_at AS registration_token_expires_at,
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
      SELECT jc.code FROM rvt_join_codes jc 
      WHERE jc.organization_id = o.id AND jc.is_active = true 
      ORDER BY jc.created_at DESC LIMIT 1
    ), '') AS join_code,
    COALESCE(o.payment_status, 'approved') AS payment_status
  FROM organizations o
  LEFT JOIN dispensary_applications da ON da.organization_id = o.id AND da.application_status = 'approved'
  LEFT JOIN profiles p ON p.organization_id = o.id 
    AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'dispensary_manager')
  WHERE o.admin_approved = true
  ORDER BY o.name;
END;
$function$;
