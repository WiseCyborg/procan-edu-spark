-- Fix security warnings by setting proper search paths for the new functions

-- Update handle_auth_events function with secure search path
CREATE OR REPLACE FUNCTION public.handle_auth_events()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
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
$$;

-- Update process_auth_events function with secure search path
CREATE OR REPLACE FUNCTION public.process_auth_events()
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
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
$$;