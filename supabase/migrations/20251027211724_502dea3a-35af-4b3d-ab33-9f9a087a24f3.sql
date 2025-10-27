-- Phase 1: Create seat auto-provisioning RPC
CREATE OR REPLACE FUNCTION public.create_initial_seats_for_organization(
  org_id UUID,
  quantity INTEGER DEFAULT 10,
  purchased_by_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  purchase_id UUID;
  default_course_id UUID;
  i INTEGER;
BEGIN
  -- Get active course (fail fast if none exists)
  SELECT id INTO default_course_id
  FROM public.courses
  WHERE is_active = true
  LIMIT 1;

  IF default_course_id IS NULL THEN
    RAISE EXCEPTION 'No active course found - cannot create seats';
  END IF;

  -- Create purchase record
  INSERT INTO public.rvt_purchases (
    organization_id,
    quantity,
    amount_paid,
    payment_method,
    purchased_by,
    transaction_id
  ) VALUES (
    org_id,
    quantity,
    0,
    'initial_allocation',
    purchased_by_id,
    'INITIAL-' || org_id::TEXT
  ) RETURNING id INTO purchase_id;

  -- Create seats
  FOR i IN 1..quantity LOOP
    INSERT INTO public.rvt_seats (
      purchase_id,
      organization_id,
      course_id,
      status
    ) VALUES (
      purchase_id,
      org_id,
      default_course_id,
      'available'
    );
  END LOOP;

  RETURN purchase_id;
END;
$$;

-- Phase 2: Update approval RPC to auto-create seats and join codes
CREATE OR REPLACE FUNCTION public.approve_dispensary_application(
  application_id uuid, 
  credits integer DEFAULT 10
)
RETURNS TABLE(success boolean, message text, organization_id uuid, access_key text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  app_record RECORD;
  new_org_id UUID;
  generated_key TEXT;
  generated_code TEXT;
  purchase_record_id UUID;
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Get application
  SELECT * INTO app_record
  FROM public.dispensary_applications
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found or already processed'::TEXT, NULL::UUID, NULL::TEXT;
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
      new_org_id, credits, auth.uid()
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
    NOW() + INTERVAL '365 days', true, auth.uid()
  );

  -- Update application with detailed notes
  UPDATE public.dispensary_applications
  SET 
    application_status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    organization_id = new_org_id,
    admin_notes = COALESCE(admin_notes, '') || 
      E'\n✅ Approved with ' || credits || ' credits' ||
      E'\n📦 Purchase ID: ' || purchase_record_id::TEXT ||
      E'\n🎫 Training seats created: ' || credits ||
      E'\n🔑 Join code: ' || generated_code ||
      E'\n📅 Code expires: ' || TO_CHAR(NOW() + INTERVAL '365 days', 'YYYY-MM-DD')
  WHERE id = application_id;

  RETURN QUERY SELECT 
    TRUE, 
    'Organization, seats, and join code created successfully'::TEXT, 
    new_org_id, 
    generated_key;
END;
$$;