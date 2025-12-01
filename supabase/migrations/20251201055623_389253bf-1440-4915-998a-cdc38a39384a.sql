-- Create consumer_certificates table for public consumer course certificates
CREATE TABLE IF NOT EXISTS public.consumer_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.consumer_enrollments(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL UNIQUE,
  badge_name TEXT NOT NULL,
  recipient_name TEXT,
  recipient_email TEXT,
  course_title TEXT NOT NULL,
  issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast verification lookups
CREATE INDEX IF NOT EXISTS idx_consumer_certs_number ON public.consumer_certificates(certificate_number);
CREATE INDEX IF NOT EXISTS idx_consumer_certs_enrollment ON public.consumer_certificates(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_consumer_certs_email ON public.consumer_certificates(recipient_email);

-- Enable RLS
ALTER TABLE public.consumer_certificates ENABLE ROW LEVEL SECURITY;

-- Public can verify certificates (read-only for verification)
CREATE POLICY "Anyone can verify consumer certificates"
  ON public.consumer_certificates
  FOR SELECT
  USING (true);

-- Users can view their own certificates (by email or session)
CREATE POLICY "Users can view their own consumer certificates"
  ON public.consumer_certificates
  FOR SELECT
  USING (
    recipient_email = current_setting('request.jwt.claims', true)::json->>'email'
    OR EXISTS (
      SELECT 1 FROM public.consumer_enrollments ce
      WHERE ce.id = enrollment_id
      AND (
        ce.user_id = auth.uid()
        OR ce.email = recipient_email
      )
    )
  );

-- Add helpful comment
COMMENT ON TABLE public.consumer_certificates IS 'Certificates issued for completing free consumer education courses';