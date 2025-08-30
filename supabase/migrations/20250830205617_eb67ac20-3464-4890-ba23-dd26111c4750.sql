-- Create trigger function to handle auth events and invoke custom email function
CREATE OR REPLACE FUNCTION public.trigger_custom_auth_emails()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert auth event into our log for processing
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
    jsonb_build_object(
      'type', TG_OP,
      'table', 'users',
      'schema', 'auth',
      'record', to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    ),
    now()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create triggers on auth.users table for INSERT and UPDATE
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_custom_auth_emails();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_custom_auth_emails();

-- Update the process_auth_events function to actually call the edge function
CREATE OR REPLACE FUNCTION public.process_auth_events()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  event_record RECORD;
  processed_count INTEGER := 0;
  supabase_url TEXT;
  service_role_key TEXT;
  webhook_response TEXT;
BEGIN
  supabase_url := 'https://zhmpwczrvitomsxjwpzc.supabase.co';
  service_role_key := current_setting('app.settings.service_role_key', true);
  
  -- Process unprocessed events
  FOR event_record IN 
    SELECT * FROM public.auth_event_log 
    WHERE processed_at IS NULL 
    ORDER BY created_at ASC
    LIMIT 50
  LOOP
    BEGIN
      -- Call the custom-auth-emails edge function
      SELECT net.http_post(
        url := supabase_url || '/functions/v1/custom-auth-emails',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := event_record.event_data
      ) INTO webhook_response;
      
      -- Mark as processed
      UPDATE public.auth_event_log 
      SET processed_at = now() 
      WHERE id = event_record.id;
      
      processed_count := processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Log error but continue processing other events
      INSERT INTO public.auth_event_log (
        event_type,
        user_id,
        email,
        event_data,
        created_at
      ) VALUES (
        'ERROR',
        event_record.user_id,
        event_record.email,
        jsonb_build_object('error', SQLERRM, 'original_event', event_record.event_data),
        now()
      );
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$function$;

-- Create a scheduled job to process auth events every minute
SELECT cron.schedule(
  'process-auth-events',
  '* * * * *', -- Every minute
  'SELECT public.process_auth_events();'
);