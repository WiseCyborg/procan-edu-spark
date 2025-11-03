-- Fix 2: Update approve_dispensary_application RPC to queue emails instead of calling synchronously
CREATE OR REPLACE FUNCTION public.approve_dispensary_application(
  application_id uuid, 
  credits integer DEFAULT 10, 
  calling_user_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  success boolean, 
  message text, 
  organization_id uuid, 
  access_key text, 
  join_code text, 
  purchase_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  app_record RECORD;
  new_org_id UUID;
  generated_key TEXT;
  generated_code TEXT;
  purchase_record_id UUID;
  verified_user_id UUID;
  registration_url TEXT;
  registration_token TEXT;
BEGIN
  -- CRITICAL: Use provided calling_user_id or fall back to auth.uid()
  verified_user_id := COALESCE(calling_user_id, auth.uid());
  
  -- Check 1: User must be authenticated
  IF verified_user_id IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      'SESSION_EXPIRED'::TEXT,
      NULL::UUID, 
      NULL::TEXT, 
      NULL::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;
  
  -- Check 2: User must have admin role
  IF NOT public.has_role(verified_user_id, 'admin') THEN
    RETURN QUERY SELECT 
      FALSE, 
      'UNAUTHORIZED_NOT_ADMIN'::TEXT,
      NULL::UUID, 
      NULL::TEXT, 
      NULL::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

  -- Log the approval attempt for debugging
  RAISE NOTICE 'Approval attempt by admin user: %', verified_user_id;

  -- Get application
  SELECT * INTO app_record
  FROM public.dispensary_applications
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE, 
      'Application not found or already processed'::TEXT, 
      NULL::UUID, 
      NULL::TEXT, 
      NULL::TEXT, 
      NULL::UUID;
    RETURN;
  END IF;

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
    app_record.license_number, generated_key, credits, true, 'approved'
  ) RETURNING id INTO new_org_id;

  -- AUTO-CREATE TRAINING SEATS
  BEGIN
    purchase_record_id := public.create_initial_seats_for_organization(
      new_org_id, credits, verified_user_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create training seats: %', SQLERRM;
  END;

  -- AUTO-GENERATE JOIN CODE
  generated_code := 'JOIN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  
  INSERT INTO public.rvt_join_codes (
    organization_id, code, max_uses, current_uses,
    expires_at, is_active, created_by
  ) VALUES (
    new_org_id, generated_code, credits * 3, 0,
    NOW() + INTERVAL '365 days', true, verified_user_id
  );

  -- Generate registration token and URL
  registration_token := ENCODE(GEN_RANDOM_BYTES(32), 'hex');
  registration_url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/manager-registration?token=' || registration_token;

  -- Update application with detailed notes and registration token
  UPDATE public.dispensary_applications
  SET 
    application_status = 'approved',
    reviewed_by = verified_user_id,
    reviewed_at = now(),
    organization_id = new_org_id,
    registration_token = registration_token,
    registration_token_expires_at = NOW() + INTERVAL '7 days',
    admin_notes = COALESCE(admin_notes, '') || 
      E'\n✅ Approved with ' || credits || ' credits' ||
      E'\n📦 Purchase ID: ' || purchase_record_id::TEXT ||
      E'\n🎫 Training seats created: ' || credits ||
      E'\n🔑 Join code: ' || generated_code ||
      E'\n📅 Code expires: ' || TO_CHAR(NOW() + INTERVAL '365 days', 'YYYY-MM-DD')
  WHERE id = application_id;

  -- Queue approval email (non-blocking, async)
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
      'credits', credits
    ),
    'approval_email_' || application_id::text, -- idempotency_key
    new_org_id, -- organization_id
    5 -- max_retries
  );

  -- Log audit trail for monitoring
  INSERT INTO public.security_audit_log (
    user_id,
    table_name,
    action_type,
    record_id,
    new_values,
    created_at
  ) VALUES (
    verified_user_id,
    'dispensary_applications',
    'APPROVAL_COMPLETE',
    application_id,
    jsonb_build_object(
      'organization_id', new_org_id,
      'join_code', generated_code,
      'purchase_id', purchase_record_id,
      'credits', credits,
      'email_queued', true
    ),
    NOW()
  );

  RETURN QUERY SELECT 
    TRUE, 
    'Organization, seats, and join code created successfully. Email queued.'::TEXT, 
    new_org_id, 
    generated_key,
    generated_code,
    purchase_record_id;
END;
$function$;

-- Fix PayPal sandbox mode flag (should be true by default)
UPDATE public.feature_flags 
SET flag_value = true,
    updated_at = NOW()
WHERE flag_key = 'paypal_sandbox_mode' 
  AND flag_value = false;