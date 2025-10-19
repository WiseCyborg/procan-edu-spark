-- Enable realtime on email_logs table
ALTER TABLE public.email_logs REPLICA IDENTITY FULL;

-- Add email_logs to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'email_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;
  END IF;
END $$;

-- Create indexes for faster email log queries
CREATE INDEX IF NOT EXISTS idx_email_logs_status_created ON public.email_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient_email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_type_created ON public.email_logs(email_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_created ON public.email_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Add metadata column if it doesn't exist (for storing additional email data)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'email_logs' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.email_logs ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create index on metadata for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_email_logs_metadata ON public.email_logs USING gin(metadata);
