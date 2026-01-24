-- Update the RPC to use gen_random_uuid() instead of gen_random_bytes
-- gen_random_uuid() is always available without extensions
CREATE OR REPLACE FUNCTION public.approve_dispensary_application(
  application_id UUID,
  credits INTEGER DEFAULT NULL,
  calling_user_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  organization_id UUID,
  access_key TEXT,
  join_code TEXT,
  purchase_id UUID,
  invite_required BOOLEAN,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record RECORD;
  new_org_id UUID;
  generated_key TEXT;
  generated_code TEXT;
  purchase_record_id UUID;
  verified_user_id UUID;
  registration_url TEXT;
  reg_token TEXT;
  final_credits INTEGER;
BEGIN
  -- Get calling user
  verified_user_id := COALESCE(calling_user_id, auth.uid());
  
  IF verified_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Authentication required'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, FALSE, 'SESSION_EXPIRED'::TEXT;
    RETURN;
  END IF;
  
  -- Check admin role
  IF NOT public.has_role(verified_user_id, 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Admin access required'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, FALSE, 'UNAUTHORIZED_NOT_ADMIN'::TEXT;
    RETURN;
  END IF;

  -- Get application
  SELECT * INTO app_record
  FROM public.dispensary_applications
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found or already processed'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID, FALSE, 'APPLICATION_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  -- Calculate credits
  final_credits := COALESCE(
    credits, 
    app_record.estimated_employees, 
    app_record.requested_credits, 
    10
  );

  RAISE NOTICE 'Allocating % credits for application %', final_credits, application_id;

  -- Generate access key
  generated_key := public.generate_dispensary_key();

  -- Create organization
  INSERT INTO public.organizations (
    name, contact_person, contact_email, contact_phone, address,
    license_number, unique_access_key, course_credits,
    admin_approved, payment_status
  ) VALUES (
    app_record.organization_name, app_record.contact_person, 
    app_record.contact_email, app_record.contact_phone, app_record.address,
    app_record.license_number, generated_key, final_credits, true, 'approved'
  ) RETURNING id INTO new_org_id;

  -- Create initial seats (non-blocking)
  BEGIN
    purchase_record_id := public.create_initial_seats_for_organization(
      new_org_id, final_credits, verified_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create training seats: %', SQLERRM;
    purchase_record_id := NULL;
  END;

  -- Generate join code
  generated_code := 'JOIN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  
  -- Insert join code
  INSERT INTO public.rvt_join_codes (
    organization_id, code, max_uses, current_uses,
    expires_at, is_active, created_by
  ) VALUES (
    new_org_id, generated_code, final_credits * 3, 0,
    NOW() + INTERVAL '365 days', true, verified_user_id
  );

  -- Generate registration token using UUID-based approach (always available, no extensions needed)
  -- Concatenate 2 UUIDs and remove dashes for a 64-char hex token
  reg_token := REPLACE(gen_random_uuid()::TEXT, '-', '') || REPLACE(gen_random_uuid()::TEXT, '-', '');
  registration_url := 'https://www.procannedu.com/register/manager?token=' || reg_token;

  -- Update application
  UPDATE public.dispensary_applications
  SET 
    application_status = 'approved',
    reviewed_by = verified_user_id,
    reviewed_at = now(),
    organization_id = new_org_id,
    registration_token = reg_token,
    registration_token_expires_at = NOW() + INTERVAL '7 days',
    admin_notes = COALESCE(admin_notes, '') || 
      E'\n✅ Approved with ' || final_credits || ' credits' ||
      E'\n📦 Purchase ID: ' || COALESCE(purchase_record_id::TEXT, 'pending') ||
      E'\n🎫 Training seats: ' || final_credits ||
      E'\n🔑 Join code: ' || generated_code ||
      E'\n📅 Code expires: ' || TO_CHAR(NOW() + INTERVAL '365 days', 'YYYY-MM-DD')
  WHERE id = application_id;

  -- Queue approval email (non-blocking)
  BEGIN
    PERFORM queue_job(
      'send_approval_email',
      jsonb_build_object(
        'application_id', application_id,
        'contact_email', app_record.contact_email,
        'contact_person', app_record.contact_person,
        'organization_name', app_record.organization_name,
        'access_key', generated_key,
        'join_code', generated_code,
        'registration_url', registration_url,
        'credits', final_credits
      ),
      'approval_email_' || application_id::text,
      new_org_id,
      5
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to queue approval email: %', SQLERRM;
  END;

  -- Audit log
  INSERT INTO public.security_audit_log (
    user_id, table_name, action_type, record_id, new_values, created_at
  ) VALUES (
    verified_user_id, 'dispensary_applications', 'APPROVAL_COMPLETE', application_id,
    jsonb_build_object(
      'organization_id', new_org_id,
      'credits', final_credits,
      'access_key', generated_key,
      'join_code', generated_code
    ),
    now()
  );

  RETURN QUERY SELECT 
    TRUE, 
    'Application approved successfully'::TEXT, 
    new_org_id, 
    generated_key, 
    generated_code, 
    purchase_record_id,
    FALSE,
    NULL::TEXT;
    
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT 
    FALSE, 
    SQLERRM::TEXT, 
    NULL::UUID, 
    NULL::TEXT, 
    NULL::TEXT, 
    NULL::UUID,
    FALSE,
    'INTERNAL_ERROR'::TEXT;
END;
$$;