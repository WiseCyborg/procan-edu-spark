-- Create admin functions for dispensary approval workflow

-- 1. Create admin function to approve dispensary applications and create organizations
CREATE OR REPLACE FUNCTION public.approve_dispensary_application(
  application_id UUID,
  credits INTEGER DEFAULT 10
)
RETURNS TABLE(success BOOLEAN, message TEXT, organization_id UUID, access_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  app_record RECORD;
  new_org_id UUID;
  generated_key TEXT;
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Get application details
  SELECT * INTO app_record
  FROM public.dispensary_applications
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found or already processed'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate unique access key
  generated_key := public.generate_dispensary_key();

  -- Create organization
  INSERT INTO public.organizations (
    name,
    contact_person,
    contact_email,
    contact_phone,
    address,
    license_number,
    unique_access_key,
    course_credits,
    admin_approved,
    payment_status
  ) VALUES (
    app_record.organization_name,
    app_record.contact_person,
    app_record.contact_email,
    app_record.contact_phone,
    app_record.address,
    app_record.license_number,
    generated_key,
    credits,
    true,
    'approved'
  ) RETURNING id INTO new_org_id;

  -- Update application status
  UPDATE public.dispensary_applications
  SET 
    application_status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    admin_notes = COALESCE(admin_notes, '') || ' - Approved and organization created with ' || credits || ' credits'
  WHERE id = application_id;

  RETURN QUERY SELECT TRUE, 'Application approved and organization created successfully'::TEXT, new_org_id, generated_key;
END;
$$;

-- 2. Create admin function to reject dispensary applications
CREATE OR REPLACE FUNCTION public.reject_dispensary_application(
  application_id UUID,
  rejection_reason TEXT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT;
    RETURN;
  END IF;

  -- Update application status
  UPDATE public.dispensary_applications
  SET 
    application_status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    admin_notes = rejection_reason
  WHERE id = application_id AND application_status = 'pending';

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Application rejected successfully'::TEXT;
  ELSE
    RETURN QUERY SELECT FALSE, 'Application not found or already processed'::TEXT;
  END IF;
END;
$$;

-- 3. Create admin function to create test organizations directly
CREATE OR REPLACE FUNCTION public.create_test_organization(
  org_name TEXT,
  contact_email TEXT,
  credits INTEGER DEFAULT 10
)
RETURNS TABLE(success BOOLEAN, message TEXT, organization_id UUID, access_key TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_id UUID;
  generated_key TEXT;
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate unique access key
  generated_key := public.generate_dispensary_key();

  -- Create test organization
  INSERT INTO public.organizations (
    name,
    contact_person,
    contact_email,
    contact_phone,
    address,
    license_number,
    unique_access_key,
    course_credits,
    admin_approved,
    payment_status
  ) VALUES (
    org_name,
    'Test Contact Person',
    contact_email,
    '555-TEST-ORG',
    '123 Test Street, Test City, MD 12345',
    'TEST-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 6)),
    generated_key,
    credits,
    true,
    'test'
  ) RETURNING id INTO new_org_id;

  RETURN QUERY SELECT TRUE, 'Test organization created successfully'::TEXT, new_org_id, generated_key;
END;
$$;