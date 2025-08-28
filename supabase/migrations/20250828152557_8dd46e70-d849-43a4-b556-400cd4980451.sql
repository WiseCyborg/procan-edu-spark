-- Fix the remaining function search path warning
CREATE OR REPLACE FUNCTION public.verify_certificate_status(cert_number text)
RETURNS TABLE(certificate_number text, status text, issue_date timestamp with time zone, expiry_date timestamp with time zone, course_title text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT 
    c.certificate_number,
    CASE 
      WHEN c.is_revoked THEN 'revoked'
      WHEN c.expiry_date IS NOT NULL AND c.expiry_date < now() THEN 'expired'
      ELSE 'valid'
    END as status,
    c.issue_date,
    c.expiry_date,
    courses.title as course_title
  FROM public.certificates c
  LEFT JOIN public.courses ON c.course_id = courses.id
  WHERE c.certificate_number = cert_number;
$$;