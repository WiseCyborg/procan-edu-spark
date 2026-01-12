-- =====================================================
-- CERTIFICATE SYSTEM FOR ALL 7 COURSES
-- =====================================================

-- 1. Course credentials configuration (one row per course)
CREATE TABLE IF NOT EXISTS public.course_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  credential_type text NOT NULL DEFAULT 'certificate',
  credential_name text NOT NULL,
  verification_prefix text NOT NULL,
  min_completion_percent integer NOT NULL DEFAULT 100,
  requires_quiz_pass boolean NOT NULL DEFAULT false,
  quiz_min_score integer,
  template_version text DEFAULT 'v1',
  is_compliance_certificate boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(course_id)
);

-- 2. Course completions tracking
CREATE TABLE IF NOT EXISTS public.course_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_percent integer NOT NULL DEFAULT 100,
  passed boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 3. User certificates (unified table for all certificate types)
CREATE TABLE IF NOT EXISTS public.user_certificates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  guest_email text,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  certificate_name text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  verification_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'revoked')),
  pdf_url text,
  recipient_name text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.course_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_credentials (read-only for all authenticated)
CREATE POLICY "Anyone can view active course credentials"
  ON public.course_credentials FOR SELECT
  USING (active = true);

-- RLS Policies for course_completions (users can view their own)
CREATE POLICY "Users can view their own completions"
  ON public.course_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.course_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_certificates
CREATE POLICY "Users can view their own certificates"
  ON public.user_certificates FOR SELECT
  USING (auth.uid() = user_id OR guest_email IS NOT NULL);

CREATE POLICY "Anyone can verify certificates by code"
  ON public.user_certificates FOR SELECT
  USING (true);

-- Seed course credentials for all 7 courses
INSERT INTO public.course_credentials (course_id, credential_name, verification_prefix, requires_quiz_pass, quiz_min_score, is_compliance_certificate)
VALUES
  -- RVT Core (compliance certificate)
  ('e6841a2f-4e92-47c3-9ed4-243ccc22338b', 'Maryland RVT Compliance Certificate', 'RVT', true, 80, true),
  -- First Time at a Dispensary
  ('fd6dc848-89a5-498e-a9e9-9647228fb532', 'First Time at a Dispensary Certificate', 'DISP', false, null, false),
  -- Cannabis 101
  ('c1ba4f7f-1e62-407d-b463-7e57e8f15520', 'Cannabis 101 Certificate of Completion', 'C101', false, null, false),
  -- Maryland Cannabis Laws
  ('6839959e-40ea-4398-8fe6-682293e1f96a', 'Maryland Cannabis Laws Certificate', 'LAW', false, null, false),
  -- Manager Training (compliance certificate)
  ('11111111-1111-4111-a111-111111111111', 'Manager Compliance Certificate', 'MGR', true, 80, true),
  -- Ganjier (specialty)
  ('22222222-2222-4222-a222-222222222222', 'Ganjier Certification', 'GAN', true, 80, false),
  -- Sommelier (specialty)
  ('33333333-3333-4333-a333-333333333333', 'Cannabis Sommelier Certification', 'SOM', true, 80, false)
ON CONFLICT (course_id) DO UPDATE SET
  credential_name = EXCLUDED.credential_name,
  verification_prefix = EXCLUDED.verification_prefix,
  requires_quiz_pass = EXCLUDED.requires_quiz_pass,
  quiz_min_score = EXCLUDED.quiz_min_score,
  is_compliance_certificate = EXCLUDED.is_compliance_certificate;

-- =====================================================
-- RPC: Generate verification code
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_verification_code(p_prefix text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_random text := '';
  i integer;
BEGIN
  -- Generate 6 random alphanumeric characters (excluding confusing chars like 0, O, 1, I)
  FOR i IN 1..6 LOOP
    v_random := v_random || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
  END LOOP;
  
  -- Format: PREFIX-YYYYMM-RANDOM6
  v_code := p_prefix || '-' || to_char(now(), 'YYYYMM') || '-' || v_random;
  
  RETURN v_code;
END;
$$;

-- =====================================================
-- RPC: Get course launch target
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_course_launch_target(p_course_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_course record;
  v_can_access boolean := true;
  v_deny_reason text;
  v_cta_label text := 'start';
  v_has_certificate boolean := false;
  v_start_target jsonb;
  v_completion_percent integer := 0;
  v_prereq_completed boolean := true;
  v_first_module record;
  v_resume_state record;
BEGIN
  v_user_id := auth.uid();
  
  -- Get course info
  SELECT * INTO v_course FROM courses WHERE id = p_course_id AND is_active = true;
  
  IF v_course IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'course_not_found',
      'cta_label', 'unavailable',
      'has_certificate', false,
      'start_target', null
    );
  END IF;
  
  -- Check if course has any published modules
  IF NOT EXISTS (SELECT 1 FROM course_modules WHERE course_id = p_course_id AND is_active = true) THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'course_not_published',
      'cta_label', 'coming_soon',
      'has_certificate', false,
      'start_target', null
    );
  END IF;
  
  -- Get first module for start target
  SELECT id, module_number INTO v_first_module 
  FROM course_modules 
  WHERE course_id = p_course_id AND is_active = true 
  ORDER BY module_number 
  LIMIT 1;
  
  -- For public consumer courses, allow access without auth
  IF v_course.course_type = 'consumer' AND v_course.is_public = true THEN
    v_can_access := true;
    v_start_target := jsonb_build_object(
      'type', 'module_overview',
      'module_id', v_first_module.id,
      'module_number', v_first_module.module_number,
      'route', '/consumer-education/' || p_course_id::text
    );
    
    RETURN jsonb_build_object(
      'can_access', v_can_access,
      'deny_reason', null,
      'cta_label', v_cta_label,
      'has_certificate', false,
      'start_target', v_start_target
    );
  END IF;
  
  -- For authenticated users
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'can_access', false,
      'deny_reason', 'auth_required',
      'cta_label', 'login',
      'has_certificate', false,
      'start_target', jsonb_build_object('route', '/auth?next=/courses')
    );
  END IF;
  
  -- Check prerequisite if required
  IF v_course.prerequisite_course_id IS NOT NULL AND v_course.prerequisite_required = true THEN
    SELECT EXISTS (
      SELECT 1 FROM course_completions 
      WHERE user_id = v_user_id AND course_id = v_course.prerequisite_course_id AND passed = true
    ) INTO v_prereq_completed;
    
    -- Also check old certificates table for RVT completion
    IF NOT v_prereq_completed THEN
      SELECT EXISTS (
        SELECT 1 FROM certificates 
        WHERE user_id = v_user_id AND course_id = v_course.prerequisite_course_id AND is_revoked = false
      ) INTO v_prereq_completed;
    END IF;
    
    IF NOT v_prereq_completed THEN
      v_can_access := false;
      v_deny_reason := 'prerequisite_required';
    END IF;
  END IF;
  
  -- Check if user has certificate for this course
  SELECT EXISTS (
    SELECT 1 FROM user_certificates 
    WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'issued'
  ) INTO v_has_certificate;
  
  -- Also check old certificates table
  IF NOT v_has_certificate THEN
    SELECT EXISTS (
      SELECT 1 FROM certificates 
      WHERE user_id = v_user_id AND course_id = p_course_id AND is_revoked = false
    ) INTO v_has_certificate;
  END IF;
  
  IF v_has_certificate THEN
    v_cta_label := 'view_certificate';
  ELSE
    -- Check for resume state
    SELECT * INTO v_resume_state 
    FROM course_resume_state 
    WHERE user_id = v_user_id AND course_id = p_course_id
    ORDER BY last_activity_at DESC
    LIMIT 1;
    
    IF v_resume_state IS NOT NULL AND v_resume_state.module_number > 1 THEN
      v_cta_label := 'continue';
    ELSE
      v_cta_label := 'start';
    END IF;
  END IF;
  
  -- Build start target
  IF v_resume_state IS NOT NULL THEN
    v_start_target := jsonb_build_object(
      'type', 'module_page',
      'module_id', v_resume_state.module_id,
      'module_number', v_resume_state.module_number,
      'page_index', v_resume_state.last_page_index,
      'route', '/course/part' || v_resume_state.module_number::text
    );
  ELSE
    v_start_target := jsonb_build_object(
      'type', 'module_overview',
      'module_id', v_first_module.id,
      'module_number', v_first_module.module_number,
      'route', '/course/part1'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'can_access', v_can_access,
    'deny_reason', v_deny_reason,
    'cta_label', v_cta_label,
    'has_certificate', v_has_certificate,
    'start_target', v_start_target,
    'course_type', v_course.course_type
  );
END;
$$;

-- =====================================================
-- RPC: Evaluate and issue certificate
-- =====================================================
CREATE OR REPLACE FUNCTION public.evaluate_and_issue_certificate(p_course_id uuid, p_guest_email text DEFAULT NULL, p_recipient_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_credentials record;
  v_completion_percent integer := 0;
  v_total_modules integer;
  v_completed_modules integer;
  v_quiz_passed boolean := true;
  v_quiz_score integer;
  v_eligible boolean := false;
  v_reason text;
  v_existing_cert record;
  v_new_code text;
  v_new_cert_id uuid;
  v_cert_name text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get course credentials config
  SELECT * INTO v_credentials 
  FROM course_credentials 
  WHERE course_id = p_course_id AND active = true;
  
  IF v_credentials IS NULL THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'no_credentials_configured',
      'issued', false,
      'certificate', null
    );
  END IF;
  
  -- Check for existing certificate
  IF v_user_id IS NOT NULL THEN
    SELECT * INTO v_existing_cert 
    FROM user_certificates 
    WHERE user_id = v_user_id AND course_id = p_course_id AND status = 'issued';
  ELSIF p_guest_email IS NOT NULL THEN
    SELECT * INTO v_existing_cert 
    FROM user_certificates 
    WHERE guest_email = p_guest_email AND course_id = p_course_id AND status = 'issued';
  END IF;
  
  IF v_existing_cert IS NOT NULL THEN
    RETURN jsonb_build_object(
      'eligible', true,
      'reason', 'already_issued',
      'issued', true,
      'certificate', jsonb_build_object(
        'id', v_existing_cert.id,
        'verification_code', v_existing_cert.verification_code,
        'certificate_name', v_existing_cert.certificate_name,
        'issued_at', v_existing_cert.issued_at,
        'pdf_url', v_existing_cert.pdf_url
      )
    );
  END IF;
  
  -- Calculate completion percentage
  SELECT COUNT(*) INTO v_total_modules 
  FROM course_modules 
  WHERE course_id = p_course_id AND is_active = true;
  
  IF v_user_id IS NOT NULL THEN
    SELECT COUNT(DISTINCT ma.module_id) INTO v_completed_modules
    FROM module_attempts ma
    JOIN course_modules cm ON cm.id = ma.module_id
    WHERE ma.user_id = v_user_id 
      AND cm.course_id = p_course_id 
      AND ma.completed = true;
  ELSE
    -- For guest users, assume they completed if calling this function
    v_completed_modules := v_total_modules;
  END IF;
  
  IF v_total_modules > 0 THEN
    v_completion_percent := (v_completed_modules * 100) / v_total_modules;
  END IF;
  
  -- Check completion threshold
  IF v_completion_percent < v_credentials.min_completion_percent THEN
    RETURN jsonb_build_object(
      'eligible', false,
      'reason', 'incomplete',
      'completion_percent', v_completion_percent,
      'required_percent', v_credentials.min_completion_percent,
      'issued', false,
      'certificate', null
    );
  END IF;
  
  -- Check quiz requirement
  IF v_credentials.requires_quiz_pass AND v_user_id IS NOT NULL THEN
    SELECT COALESCE(MAX(ea.score), 0) INTO v_quiz_score
    FROM exam_attempts ea
    WHERE ea.user_id = v_user_id 
      AND ea.course_id = p_course_id 
      AND ea.passed = true;
    
    IF v_quiz_score < COALESCE(v_credentials.quiz_min_score, 80) THEN
      v_quiz_passed := false;
    END IF;
    
    IF NOT v_quiz_passed THEN
      RETURN jsonb_build_object(
        'eligible', false,
        'reason', 'quiz_not_passed',
        'quiz_score', v_quiz_score,
        'required_score', v_credentials.quiz_min_score,
        'issued', false,
        'certificate', null
      );
    END IF;
  END IF;
  
  -- Generate verification code
  v_new_code := generate_verification_code(v_credentials.verification_prefix);
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM user_certificates WHERE verification_code = v_new_code) LOOP
    v_new_code := generate_verification_code(v_credentials.verification_prefix);
  END LOOP;
  
  -- Get recipient name
  IF p_recipient_name IS NOT NULL THEN
    v_cert_name := p_recipient_name;
  ELSIF v_user_id IS NOT NULL THEN
    SELECT COALESCE(first_name || ' ' || last_name, email) INTO v_cert_name
    FROM profiles
    WHERE user_id = v_user_id;
  ELSE
    v_cert_name := 'Certificate Holder';
  END IF;
  
  -- Issue certificate
  INSERT INTO user_certificates (
    user_id, guest_email, course_id, certificate_name, 
    verification_code, recipient_name, metadata
  )
  VALUES (
    v_user_id, p_guest_email, p_course_id, v_credentials.credential_name,
    v_new_code, v_cert_name, 
    jsonb_build_object(
      'completion_percent', v_completion_percent,
      'quiz_score', v_quiz_score,
      'is_compliance', v_credentials.is_compliance_certificate
    )
  )
  RETURNING id INTO v_new_cert_id;
  
  -- Record completion
  IF v_user_id IS NOT NULL THEN
    INSERT INTO course_completions (user_id, course_id, completion_percent, passed)
    VALUES (v_user_id, p_course_id, v_completion_percent, true)
    ON CONFLICT (user_id, course_id) DO UPDATE SET
      completed_at = now(),
      completion_percent = EXCLUDED.completion_percent,
      passed = EXCLUDED.passed;
  END IF;
  
  RETURN jsonb_build_object(
    'eligible', true,
    'reason', 'issued_now',
    'issued', true,
    'certificate', jsonb_build_object(
      'id', v_new_cert_id,
      'verification_code', v_new_code,
      'certificate_name', v_credentials.credential_name,
      'issued_at', now(),
      'recipient_name', v_cert_name
    )
  );
END;
$$;

-- =====================================================
-- RPC: Verify certificate by code
-- =====================================================
CREATE OR REPLACE FUNCTION public.verify_certificate(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cert record;
  v_course record;
BEGIN
  SELECT uc.*, c.title as course_title, cc.is_compliance_certificate
  INTO v_cert
  FROM user_certificates uc
  JOIN courses c ON c.id = uc.course_id
  LEFT JOIN course_credentials cc ON cc.course_id = uc.course_id
  WHERE uc.verification_code = UPPER(TRIM(p_code));
  
  IF v_cert IS NULL THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'not_found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'valid', v_cert.status = 'issued',
    'status', v_cert.status,
    'certificate_name', v_cert.certificate_name,
    'course_title', v_cert.course_title,
    'issued_at', v_cert.issued_at,
    'recipient_name', v_cert.recipient_name,
    'is_compliance', COALESCE(v_cert.is_compliance_certificate, false),
    'verification_code', v_cert.verification_code
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_course_launch_target(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_and_issue_certificate(uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_verification_code(text) TO authenticated;