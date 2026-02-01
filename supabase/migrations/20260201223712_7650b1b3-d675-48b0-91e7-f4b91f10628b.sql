-- Drop and recreate regenerate_manager_token_by_org with gen_random_uuid() instead of GEN_RANDOM_BYTES
CREATE OR REPLACE FUNCTION public.regenerate_manager_token_by_org(org_id uuid)
RETURNS TABLE(
  success boolean,
  new_token text,
  expires_at timestamptz,
  message text,
  application_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token text;
  v_expires_at timestamptz;
  v_app_record record;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT 
      false,
      NULL::text,
      NULL::timestamptz,
      'Unauthorized: Admin access required'::text,
      NULL::uuid;
    RETURN;
  END IF;

  -- Get application details by organization_id
  SELECT * INTO v_app_record
  FROM public.dispensary_applications
  WHERE organization_id = org_id
    AND application_status = 'approved'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      NULL::text,
      NULL::timestamptz,
      'No approved application found for this organization'::text,
      NULL::uuid;
    RETURN;
  END IF;

  -- Generate new registration token using gen_random_uuid (always available)
  v_new_token := REPLACE(gen_random_uuid()::TEXT, '-', '') || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Update application with new token
  UPDATE public.dispensary_applications
  SET 
    registration_token = v_new_token,
    registration_token_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = v_app_record.id;

  -- Log the action (skip if table doesn't exist)
  BEGIN
    INSERT INTO public.security_audit_log (
      user_id,
      table_name,
      action_type,
      record_id,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      'dispensary_applications',
      'TOKEN_REGENERATED',
      v_app_record.id,
      jsonb_build_object(
        'regenerated_by', auth.uid(),
        'organization_id', org_id,
        'new_expiry', v_expires_at
      ),
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    -- security_audit_log table doesn't exist, skip logging
    NULL;
  END;

  RETURN QUERY SELECT 
    true,
    v_new_token,
    v_expires_at,
    'Token regenerated successfully'::text,
    v_app_record.id;
END;
$$;

-- Also update regenerate_manager_token to use gen_random_uuid
CREATE OR REPLACE FUNCTION public.regenerate_manager_token(application_id uuid)
RETURNS TABLE(
  success boolean,
  new_token text,
  expires_at timestamptz,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token text;
  v_expires_at timestamptz;
  v_app_record record;
BEGIN
  -- Check if caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT 
      false,
      NULL::text,
      NULL::timestamptz,
      'Unauthorized: Admin access required'::text;
    RETURN;
  END IF;

  -- Get application details
  SELECT * INTO v_app_record
  FROM public.dispensary_applications
  WHERE id = application_id
    AND application_status = 'approved';

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      false,
      NULL::text,
      NULL::timestamptz,
      'Application not found or not approved'::text;
    RETURN;
  END IF;

  -- Generate new registration token using gen_random_uuid (always available)
  v_new_token := REPLACE(gen_random_uuid()::TEXT, '-', '') || REPLACE(gen_random_uuid()::TEXT, '-', '');
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Update application with new token
  UPDATE public.dispensary_applications
  SET 
    registration_token = v_new_token,
    registration_token_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = application_id;

  -- Log the action (skip if table doesn't exist)
  BEGIN
    INSERT INTO public.security_audit_log (
      user_id,
      table_name,
      action_type,
      record_id,
      new_values,
      created_at
    ) VALUES (
      auth.uid(),
      'dispensary_applications',
      'TOKEN_REGENERATED',
      application_id,
      jsonb_build_object(
        'regenerated_by', auth.uid(),
        'new_expiry', v_expires_at
      ),
      NOW()
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN QUERY SELECT 
    true,
    v_new_token,
    v_expires_at,
    'Token regenerated successfully'::text;
END;
$$;