-- ================================================
-- FIX #1: Profile creation - use UPSERT in handle_new_user trigger
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Use UPSERT to prevent duplicate key errors
  INSERT INTO public.profiles (
    user_id,
    email_cache,
    first_name,
    last_name,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email_cache = EXCLUDED.email_cache,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ================================================
-- FIX #2: Certificate trigger - Remove current_setting dependency
-- ================================================
CREATE OR REPLACE FUNCTION public.trigger_certificate_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT := 'https://zhmpwczrvitomsxjwpzc.supabase.co';
  v_service_key TEXT;
BEGIN
  -- Get service key from vault or skip if not available
  BEGIN
    SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
    WHERE name = 'service_role_key'
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    -- If vault access fails, use job queue instead
    PERFORM public.queue_job(
      'trigger_certificate_email',
      jsonb_build_object('certificateId', NEW.id),
      'cert_email_' || NEW.id::text
    );
    RETURN NEW;
  END;

  -- Call certificate email edge function (async)
  IF v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := v_base_url || '/functions/v1/trigger-certificate-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object('certificateId', NEW.id)
    );
  ELSE
    -- Fallback: queue the job for async processing
    PERFORM public.queue_job(
      'trigger_certificate_email',
      jsonb_build_object('certificateId', NEW.id),
      'cert_email_' || NEW.id::text
    );
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never fail certificate creation due to email issues
  RAISE WARNING 'trigger_certificate_email warning for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ================================================
-- FIX #3: Manager welcome email trigger - Remove current_setting dependency  
-- ================================================
CREATE OR REPLACE FUNCTION public.trigger_manager_welcome_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_profile RECORD;
  org_info RECORD;
  v_base_url TEXT := 'https://zhmpwczrvitomsxjwpzc.supabase.co';
  v_service_key TEXT;
BEGIN
  -- Only trigger if registration was just completed
  IF NEW.registration_completed = true AND (OLD.registration_completed IS NULL OR OLD.registration_completed = false) THEN
    
    -- Get manager profile
    SELECT p.*, au.email 
    INTO manager_profile
    FROM profiles p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.organization_id = NEW.organization_id
    AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = p.user_id 
      AND ur.role = 'dispensary_manager'
    )
    LIMIT 1;
    
    -- Get organization info
    SELECT * INTO org_info
    FROM organizations
    WHERE id = NEW.organization_id;
    
    -- Call welcome email edge function (async, won't block)
    IF manager_profile.user_id IS NOT NULL THEN
      -- Try to get service key from vault
      BEGIN
        SELECT decrypted_secret INTO v_service_key
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        v_service_key := NULL;
      END;

      IF v_service_key IS NOT NULL THEN
        PERFORM net.http_post(
          url := v_base_url || '/functions/v1/send-welcome-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
          ),
          body := jsonb_build_object(
            'userId', manager_profile.user_id,
            'email', manager_profile.email,
            'firstName', manager_profile.first_name,
            'organizationName', org_info.name
          )
        );
      ELSE
        -- Fallback: queue the job
        PERFORM public.queue_job(
          'send_welcome_email',
          jsonb_build_object(
            'userId', manager_profile.user_id,
            'email', manager_profile.email,
            'firstName', manager_profile.first_name,
            'organizationName', org_info.name
          ),
          'welcome_' || manager_profile.user_id::text
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block registration due to email issues
  RAISE WARNING 'trigger_manager_welcome_email warning: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- ================================================
-- FIX #4: Add missing unique constraint for user_progress ON CONFLICT
-- (Check if exists first to avoid errors)
-- ================================================
DO $$
BEGIN
  -- Check if unique constraint already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'user_progress_user_id_module_id_key'
    AND conrelid = 'public.user_progress'::regclass
  ) THEN
    -- Add unique constraint on (user_id, module_id) for simpler ON CONFLICT
    ALTER TABLE public.user_progress
    ADD CONSTRAINT user_progress_user_id_module_id_key UNIQUE (user_id, module_id);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint may already exist or table structure differs: %', SQLERRM;
END;
$$;