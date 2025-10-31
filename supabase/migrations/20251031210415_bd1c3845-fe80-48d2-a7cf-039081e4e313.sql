-- Fix create_test_organization to include seats, join code, and registration token

-- Drop the existing function first
DROP FUNCTION IF EXISTS public.create_test_organization(TEXT, TEXT, INTEGER);

-- Create the updated function with additional return fields
CREATE OR REPLACE FUNCTION public.create_test_organization(
  org_name TEXT,
  contact_email TEXT,
  credits INTEGER DEFAULT 10
)
RETURNS TABLE(
  success BOOLEAN, 
  message TEXT, 
  organization_id UUID, 
  access_key TEXT,
  join_code TEXT,
  registration_token TEXT,
  registration_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_org_id UUID;
  generated_key TEXT;
  generated_join_code TEXT;
  generated_reg_token TEXT;
  registration_link TEXT;
  course_uuid UUID;
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Unauthorized: Admin access required'::TEXT, 
      NULL::UUID, 
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT;
    RETURN;
  END IF;

  -- Generate unique access key
  generated_key := public.generate_dispensary_key();
  
  -- Generate join code (6 characters uppercase alphanumeric)
  generated_join_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 6));
  
  -- Generate registration token
  generated_reg_token := ENCODE(GEN_RANDOM_BYTES(32), 'hex');

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

  -- Get the course ID (Maryland RVT course)
  SELECT id INTO course_uuid FROM courses WHERE title ILIKE '%responsible vendor%' LIMIT 1;
  
  IF course_uuid IS NULL THEN
    SELECT id INTO course_uuid FROM courses LIMIT 1;
  END IF;

  -- Allocate training seats using the existing function
  IF course_uuid IS NOT NULL THEN
    PERFORM public.create_initial_seats_for_organization(new_org_id, course_uuid, credits);
  END IF;

  -- Create join code
  INSERT INTO public.rvt_join_codes (
    code,
    organization_id,
    course_id,
    created_by,
    max_uses,
    expires_at,
    is_active
  ) VALUES (
    generated_join_code,
    new_org_id,
    course_uuid,
    auth.uid(),
    credits * 10, -- Allow 10x uses as buffer
    NOW() + INTERVAL '365 days',
    true
  );

  -- Create registration token
  registration_link := 'https://zhmpwczrvitomsxjwpzc.supabase.co/manager-registration?token=' || generated_reg_token;
  
  INSERT INTO public.dispensary_applications (
    organization_name,
    contact_person,
    contact_email,
    organization_id,
    application_status,
    admin_notes,
    registration_token,
    registration_token_expires_at,
    requested_credits
  ) VALUES (
    org_name,
    'Test Contact Person',
    contact_email,
    new_org_id,
    'approved',
    'Test organization created directly by admin',
    generated_reg_token,
    NOW() + INTERVAL '7 days',
    credits
  );

  -- Log the action
  INSERT INTO communication_logs (
    communication_type,
    recipient_email,
    subject,
    content,
    delivery_status,
    organization_id,
    metadata
  ) VALUES (
    'system_action',
    contact_email,
    'Test Organization Created',
    'Test organization ' || org_name || ' created with ' || credits || ' training seats',
    'completed',
    new_org_id,
    jsonb_build_object(
      'action', 'test_org_creation',
      'access_key', generated_key,
      'join_code', generated_join_code,
      'seats_allocated', credits
    )
  );

  RETURN QUERY SELECT 
    TRUE, 
    'Test organization created with seats and codes'::TEXT, 
    new_org_id, 
    generated_key,
    generated_join_code,
    generated_reg_token,
    registration_link;
END;
$$;