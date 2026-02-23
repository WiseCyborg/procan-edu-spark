-- Fix 4: Auto-create org membership on org creation
-- Uses SECURITY DEFINER + auth.uid() which works when insert comes through PostgREST
CREATE OR REPLACE FUNCTION public.auto_create_org_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create if no membership exists yet and we have a user context
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = NEW.id AND user_id = auth.uid()
  ) THEN
    INSERT INTO organization_members (
      organization_id, user_id, email, role, status, member_type
    )
    SELECT 
      NEW.id, auth.uid(), 
      COALESCE(p.email_cache, u.email, 'unknown'),
      'manager', 'active', 'manager'
    FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_org_membership ON public.organizations;
CREATE TRIGGER trg_auto_org_membership
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_org_membership();

-- Fix 3D: Add certificate_audit_log write to evaluate_and_issue_certificate DB function
-- First check if the function exists, then replace it to include audit logging
CREATE OR REPLACE FUNCTION public.evaluate_and_issue_certificate(
  p_user_id uuid,
  p_course_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completion_percent integer;
  v_passed boolean;
  v_cert_number text;
  v_verification_code text;
  v_cert_id uuid;
  v_course_title text;
  v_credential record;
  v_user_name text;
BEGIN
  -- Get course credential requirements
  SELECT * INTO v_credential
  FROM course_credentials
  WHERE course_id = p_course_id AND active = true
  LIMIT 1;

  IF v_credential IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active credential found for this course');
  END IF;

  -- Calculate completion percentage
  SELECT 
    ROUND(COUNT(CASE WHEN up.is_completed THEN 1 END)::numeric / NULLIF(COUNT(cm.id), 0) * 100)::integer,
    COUNT(CASE WHEN up.is_completed THEN 1 END) = COUNT(cm.id)
  INTO v_completion_percent, v_passed
  FROM course_modules cm
  LEFT JOIN user_progress up ON up.module_id = cm.id AND up.user_id = p_user_id AND up.course_id = p_course_id
  WHERE cm.course_id = p_course_id AND cm.is_active = true;

  -- Check minimum completion
  IF v_completion_percent < v_credential.min_completion_percent THEN
    RETURN jsonb_build_object('success', false, 'error', 'Completion percentage too low', 'completion_percent', v_completion_percent);
  END IF;

  -- Upsert course_completions
  INSERT INTO course_completions (user_id, course_id, completion_percent, passed)
  VALUES (p_user_id, p_course_id, v_completion_percent, v_passed)
  ON CONFLICT (user_id, course_id) DO UPDATE SET
    completion_percent = EXCLUDED.completion_percent,
    passed = EXCLUDED.passed,
    completed_at = now();

  -- Generate certificate number
  v_cert_number := v_credential.verification_prefix || '-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(md5(random()::text), 1, 6));
  
  -- Generate verification code
  v_verification_code := v_credential.verification_prefix || '-' || to_char(now(), 'YYYYMM') || '-' || upper(substr(md5(random()::text || now()::text), 1, 6));

  -- Get user name
  SELECT COALESCE(NULLIF(TRIM(first_name || ' ' || COALESCE(last_name, '')), ''), email_cache, 'Student')
  INTO v_user_name
  FROM profiles WHERE user_id = p_user_id;

  -- Get course title
  SELECT title INTO v_course_title FROM courses WHERE id = p_course_id;

  -- Insert user_certificates
  INSERT INTO user_certificates (user_id, course_id, certificate_name, verification_code, recipient_name, pdf_url, metadata)
  VALUES (
    p_user_id, 
    p_course_id, 
    v_credential.credential_name,
    v_verification_code,
    v_user_name,
    'https://procannedu.lovable.app/verify/' || v_cert_number,
    jsonb_build_object('completion_percent', v_completion_percent, 'credential_type', v_credential.credential_type)
  )
  ON CONFLICT (verification_code) DO NOTHING;

  -- Insert certificate_audit_log
  INSERT INTO certificate_audit_log (certificate_id, action, actor_id, metadata)
  SELECT uc.id, 'ISSUED', p_user_id, jsonb_build_object(
    'certificate_name', v_credential.credential_name,
    'course_id', p_course_id,
    'verification_code', v_verification_code,
    'source', 'evaluate_and_issue_certificate'
  )
  FROM user_certificates uc
  WHERE uc.user_id = p_user_id AND uc.course_id = p_course_id AND uc.verification_code = v_verification_code
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'certificate_number', v_cert_number,
    'verification_code', v_verification_code,
    'completion_percent', v_completion_percent
  );
END;
$$;