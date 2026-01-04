-- Fix approve_dispensary_application to use correct domain
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
  purchase_id UUID
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
  verified_user_id := COALESCE(calling_user_id, auth.uid());
  
  IF verified_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'SESSION_EXPIRED'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;
  
  IF NOT public.has_role(verified_user_id, 'admin') THEN
    RETURN QUERY SELECT FALSE, 'UNAUTHORIZED_NOT_ADMIN'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  SELECT * INTO app_record
  FROM public.dispensary_applications
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found or already processed'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  final_credits := COALESCE(
    credits, 
    app_record.estimated_employees, 
    app_record.requested_credits, 
    10
  );

  RAISE NOTICE 'Allocating % credits for application %', final_credits, application_id;

  generated_key := public.generate_dispensary_key();

  INSERT INTO public.organizations (
    name, contact_person, contact_email, contact_phone, address,
    license_number, unique_access_key, course_credits,
    admin_approved, payment_status
  ) VALUES (
    app_record.organization_name, app_record.contact_person, 
    app_record.contact_email, app_record.contact_phone, app_record.address,
    app_record.license_number, generated_key, final_credits, true, 'approved'
  ) RETURNING id INTO new_org_id;

  BEGIN
    purchase_record_id := public.create_initial_seats_for_organization(
      new_org_id, final_credits, verified_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create training seats: %', SQLERRM;
  END;

  generated_code := 'JOIN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  
  INSERT INTO public.rvt_join_codes (
    organization_id, code, max_uses, current_uses,
    expires_at, is_active, created_by
  ) VALUES (
    new_org_id, generated_code, final_credits * 3, 0,
    NOW() + INTERVAL '365 days', true, verified_user_id
  );

  reg_token := ENCODE(GEN_RANDOM_BYTES(32), 'hex');
  -- FIXED: Use correct Lovable domain
  registration_url := 'https://procann-edu.lovable.app/register/manager?token=' || reg_token;

  UPDATE public.dispensary_applications
  SET 
    application_status = 'approved',
    reviewed_by = verified_user_id,
    reviewed_at = now(),
    organization_id = new_org_id,
    registration_token = reg_token,
    registration_token_expires_at = NOW() + INTERVAL '7 days',
    admin_notes = COALESCE(admin_notes, '') || 
      E'\n✅ Approved with ' || final_credits || ' credits (based on ' || final_credits || ' estimated employees)' ||
      E'\n📦 Purchase ID: ' || purchase_record_id::TEXT ||
      E'\n🎫 Training seats created: ' || final_credits ||
      E'\n🔑 Join code: ' || generated_code ||
      E'\n📅 Code expires: ' || TO_CHAR(NOW() + INTERVAL '365 days', 'YYYY-MM-DD')
  WHERE id = application_id;

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

  INSERT INTO public.security_audit_log (
    user_id, table_name, action_type, record_id, new_values, created_at
  ) VALUES (
    verified_user_id, 'dispensary_applications', 'APPROVAL_COMPLETE', application_id,
    jsonb_build_object(
      'organization_id', new_org_id,
      'join_code', generated_code,
      'purchase_id', purchase_record_id,
      'credits', final_credits,
      'based_on_estimated_employees', true,
      'email_queued', true
    ),
    NOW()
  );

  RETURN QUERY SELECT 
    TRUE, 
    'Organization created with ' || final_credits || ' seats based on estimated employees'::TEXT, 
    new_org_id, 
    generated_key,
    generated_code,
    purchase_record_id;
END;
$$;