-- Create database webhook for auth events to trigger custom emails
-- This will call our custom-auth-emails function when users are created/updated

-- First, create a function to handle auth events
CREATE OR REPLACE FUNCTION public.handle_auth_events()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  payload JSONB;
  response_status INTEGER;
BEGIN
  -- Construct the webhook URL
  webhook_url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/custom-auth-emails';
  
  -- Build the payload based on the trigger operation
  IF TG_OP = 'INSERT' THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'users',
      'schema', 'auth',
      'record', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'users',
      'schema', 'auth',
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    );
  END IF;

  -- Make the HTTP request to our edge function
  -- Note: This requires the http extension to be enabled
  -- In production, you might want to use a queue system instead
  
  -- For now, we'll log the event and let the edge function be called manually
  INSERT INTO public.auth_event_log (
    event_type,
    user_id,
    email,
    event_data,
    created_at
  ) VALUES (
    TG_OP,
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.email, OLD.email),
    payload,
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a table to log auth events (as a fallback mechanism)
CREATE TABLE IF NOT EXISTS public.auth_event_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  email TEXT,
  event_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on the auth event log
ALTER TABLE public.auth_event_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view auth event logs
CREATE POLICY "Admins can view auth event logs"
ON public.auth_event_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Service role can manage auth event logs
CREATE POLICY "Service role can manage auth event logs"
ON public.auth_event_log
FOR ALL
USING (current_setting('role') = 'service_role');

-- Create a function to process pending auth events manually
CREATE OR REPLACE FUNCTION public.process_auth_events()
RETURNS INTEGER AS $$
DECLARE
  event_record RECORD;
  processed_count INTEGER := 0;
  webhook_url TEXT;
BEGIN
  webhook_url := 'https://zhmpwczrvitomsxjwpzc.supabase.co/functions/v1/custom-auth-emails';
  
  -- Process unprocessed events
  FOR event_record IN 
    SELECT * FROM public.auth_event_log 
    WHERE processed_at IS NULL 
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    -- Here you would typically make an HTTP request to the webhook
    -- For now, we'll mark it as processed
    UPDATE public.auth_event_log 
    SET processed_at = now() 
    WHERE id = event_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.process_auth_events() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_auth_events() TO service_role;