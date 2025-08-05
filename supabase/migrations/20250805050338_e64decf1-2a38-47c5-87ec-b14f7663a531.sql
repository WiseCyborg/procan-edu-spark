-- Create secure certificate verification function that only returns validation status
CREATE OR REPLACE FUNCTION public.verify_certificate_status(cert_number text)
RETURNS TABLE (
  certificate_number text,
  status text,
  issue_date timestamp with time zone,
  expiry_date timestamp with time zone,
  course_title text
)
LANGUAGE sql
SECURITY DEFINER
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
  FROM certificates c
  LEFT JOIN courses ON c.course_id = courses.id
  WHERE c.certificate_number = cert_number;
$$;

-- Create email verification codes table for MFA
CREATE TABLE public.email_verification_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('login', 'exam_submission')),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on verification codes
ALTER TABLE public.email_verification_codes ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own verification codes
CREATE POLICY "Users can view their own verification codes"
ON public.email_verification_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage verification codes"
ON public.email_verification_codes
FOR ALL
USING (true);

-- Create index for efficient lookups
CREATE INDEX idx_email_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX idx_email_verification_codes_code ON public.email_verification_codes(code);
CREATE INDEX idx_email_verification_codes_expires_at ON public.email_verification_codes(expires_at);

-- Update certificates table to remove public access to PII
-- Create new RLS policy that restricts access to certificate details
DROP POLICY IF EXISTS "Service role can manage certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;

-- Users can only view their own certificates with full details
CREATE POLICY "Users can view their own certificates"
ON public.certificates
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can manage all certificates
CREATE POLICY "Service role can manage certificates"
ON public.certificates
FOR ALL
USING (true);

-- Admins can view all certificates
CREATE POLICY "Admins can view all certificates"
ON public.certificates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);