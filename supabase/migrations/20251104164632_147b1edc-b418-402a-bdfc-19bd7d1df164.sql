-- Create function to regenerate manager registration tokens
CREATE OR REPLACE FUNCTION public.regenerate_manager_token(application_id uuid)
RETURNS TABLE(
  success boolean,
  new_token text,
  expires_at timestamptz,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Generate new registration token
  v_new_token := ENCODE(GEN_RANDOM_BYTES(32), 'hex');
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Update application with new token
  UPDATE public.dispensary_applications
  SET 
    registration_token = v_new_token,
    registration_token_expires_at = v_expires_at,
    updated_at = NOW()
  WHERE id = application_id;

  -- Log the action
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

  RETURN QUERY SELECT 
    true,
    v_new_token,
    v_expires_at,
    'Token regenerated successfully'::text;
END;
$$;