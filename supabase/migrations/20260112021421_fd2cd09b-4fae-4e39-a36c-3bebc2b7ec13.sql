-- Enhanced verify_certificate function to support multiple verification methods
CREATE OR REPLACE FUNCTION public.verify_certificate(
  p_code text DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_initial text DEFAULT NULL,
  p_course_id uuid DEFAULT NULL,
  p_year int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_cert record;
  v_match_count int;
BEGIN
  -- Method 1: Verify by code (primary method)
  IF p_code IS NOT NULL AND p_code != '' THEN
    -- Check user_certificates table first
    SELECT 
      uc.id,
      uc.verification_code,
      uc.certificate_name,
      uc.issued_at,
      uc.status,
      uc.recipient_name,
      c.title as course_title,
      cc.is_compliance_certificate
    INTO v_cert
    FROM user_certificates uc
    JOIN courses c ON c.id = uc.course_id
    LEFT JOIN course_credentials cc ON cc.course_id = uc.course_id
    WHERE UPPER(uc.verification_code) = UPPER(p_code);
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'valid', v_cert.status = 'issued',
        'status', v_cert.status,
        'certificate_name', v_cert.certificate_name,
        'course_title', v_cert.course_title,
        'issued_at', v_cert.issued_at,
        'recipient_name', COALESCE(v_cert.recipient_name, 'Certificate Holder'),
        'is_compliance', COALESCE(v_cert.is_compliance_certificate, false),
        'verification_code', v_cert.verification_code,
        'method', 'code'
      );
    END IF;
    
    -- Also check legacy certificates table
    SELECT 
      cert.id,
      cert.certificate_number,
      cert.issue_date,
      cert.expiry_date,
      cert.is_revoked,
      cert.tier_badge,
      c.title as course_title,
      p.first_name,
      p.last_name
    INTO v_cert
    FROM certificates cert
    JOIN courses c ON c.id = cert.course_id
    LEFT JOIN profiles p ON p.user_id = cert.user_id
    WHERE UPPER(cert.certificate_number) = UPPER(p_code);
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'valid', NOT COALESCE(v_cert.is_revoked, false),
        'status', CASE WHEN v_cert.is_revoked THEN 'revoked' ELSE 'issued' END,
        'certificate_name', v_cert.course_title || ' Certificate',
        'course_title', v_cert.course_title,
        'issued_at', v_cert.issue_date,
        'expiry_date', v_cert.expiry_date,
        'recipient_name', COALESCE(v_cert.first_name || ' ' || LEFT(COALESCE(v_cert.last_name, ''), 1) || '.', 'Certificate Holder'),
        'is_compliance', true,
        'verification_code', v_cert.certificate_number,
        'method', 'code'
      );
    END IF;
    
    -- Not found
    RETURN jsonb_build_object(
      'valid', false,
      'reason', 'not_found',
      'method', 'code'
    );
  END IF;
  
  -- Method 2: Verify by name (partial match, privacy-safe)
  IF p_first_name IS NOT NULL AND p_last_initial IS NOT NULL THEN
    -- Count matches (privacy-safe: only return count and basic info)
    SELECT COUNT(*)
    INTO v_match_count
    FROM user_certificates uc
    JOIN courses c ON c.id = uc.course_id
    WHERE uc.status = 'issued'
      AND LOWER(uc.recipient_name) LIKE LOWER(p_first_name) || ' ' || UPPER(p_last_initial) || '%'
      AND (p_course_id IS NULL OR uc.course_id = p_course_id)
      AND (p_year IS NULL OR EXTRACT(YEAR FROM uc.issued_at) = p_year);
    
    IF v_match_count > 0 THEN
      -- Get course name if single match or course specified
      SELECT c.title
      INTO v_cert
      FROM user_certificates uc
      JOIN courses c ON c.id = uc.course_id
      WHERE uc.status = 'issued'
        AND LOWER(uc.recipient_name) LIKE LOWER(p_first_name) || ' ' || UPPER(p_last_initial) || '%'
        AND (p_course_id IS NULL OR uc.course_id = p_course_id)
        AND (p_year IS NULL OR EXTRACT(YEAR FROM uc.issued_at) = p_year)
      LIMIT 1;
      
      RETURN jsonb_build_object(
        'valid', true,
        'match_count', v_match_count,
        'message', v_match_count || ' valid certificate(s) found for ' || p_first_name || ' ' || UPPER(p_last_initial) || '.',
        'hint', 'Please ask the certificate holder to provide their verification code for full details.',
        'method', 'name_search'
      );
    END IF;
    
    RETURN jsonb_build_object(
      'valid', false,
      'match_count', 0,
      'reason', 'no_matches',
      'method', 'name_search'
    );
  END IF;
  
  -- No valid search method provided
  RETURN jsonb_build_object(
    'valid', false,
    'reason', 'invalid_request',
    'message', 'Please provide a verification code or name search criteria.'
  );
END;
$$;

-- Grant execute to public for verification
GRANT EXECUTE ON FUNCTION public.verify_certificate(text, text, text, uuid, int) TO anon, authenticated;