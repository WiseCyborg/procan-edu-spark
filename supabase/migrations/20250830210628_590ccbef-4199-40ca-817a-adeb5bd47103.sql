-- Create email fallback logging table
CREATE TABLE IF NOT EXISTS public.email_fallback_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL,
  fallback_type TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on the fallback log table
ALTER TABLE public.email_fallback_log ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access to fallback logs
CREATE POLICY "Admin can view all fallback logs" 
ON public.email_fallback_log 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_email_fallback_log_created_at 
ON public.email_fallback_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_fallback_log_type 
ON public.email_fallback_log(fallback_type);