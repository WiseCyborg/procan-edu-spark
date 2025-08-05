-- Create email_logs table to prevent duplicate emails
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own email logs" 
ON public.email_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert email logs" 
ON public.email_logs 
FOR INSERT 
WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_email_logs_recipient_type_sent ON public.email_logs(recipient_email, email_type, sent_at);

-- Create unique constraint to prevent duplicate welcome emails within 24 hours
CREATE UNIQUE INDEX idx_unique_welcome_email_24h 
ON public.email_logs(recipient_email, email_type, (DATE_TRUNC('day', sent_at))) 
WHERE email_type = 'welcome' AND status = 'sent';