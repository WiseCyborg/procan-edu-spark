-- Create table for auth event logging if it doesn't exist
CREATE TABLE IF NOT EXISTS public.auth_event_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  email TEXT,
  event_data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auth_event_log ENABLE ROW LEVEL SECURITY;

-- Create policies for auth event log (admin only)
CREATE POLICY "Only admins can view auth events" 
ON public.auth_event_log 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger function for auth events
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

  -- Log the event for processing
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Create trigger on auth.users for INSERT and UPDATE events
DROP TRIGGER IF EXISTS auth_user_events ON auth.users;
CREATE TRIGGER auth_user_events
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_events();

-- Create function to process auth events (called by cron or manually)
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
    -- Mark as processed
    UPDATE public.auth_event_log 
    SET processed_at = now() 
    WHERE id = event_record.id;
    
    processed_count := processed_count + 1;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';