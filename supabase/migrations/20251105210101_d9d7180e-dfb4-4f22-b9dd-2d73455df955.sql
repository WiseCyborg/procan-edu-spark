-- PHASE 1: CRITICAL FIXES - Application Submission
-- Fix notification_queue RLS to allow trigger inserts
CREATE POLICY "Allow trigger functions to insert notifications"
ON public.notification_queue
FOR INSERT
WITH CHECK (true);

-- Remove duplicate dispensary_applications INSERT policy
DROP POLICY IF EXISTS "Public can submit dispensary applications" ON public.dispensary_applications;

-- Fix handle_new_dispensary_application trigger to handle NULL dispensary_number
CREATE OR REPLACE FUNCTION public.handle_new_dispensary_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Queue notification for admin
  INSERT INTO public.notification_queue (
    notification_type,
    recipient_email,
    subject,
    priority,
    metadata,
    scheduled_for
  ) VALUES (
    'admin_alert',
    'admin@procannedu.com',
    'New Dispensary Application Received',
    'high',
    jsonb_build_object(
      'application_id', NEW.id,
      'organization_name', NEW.organization_name,
      'contact_person', NEW.contact_person,
      'contact_email', NEW.contact_email,
      'dispensary_number', COALESCE(NEW.dispensary_number, 'Pending Assignment'),
      'submitted_at', NEW.created_at
    ),
    NOW()
  );

  -- Queue confirmation email to applicant
  INSERT INTO public.notification_queue (
    notification_type,
    recipient_email,
    subject,
    priority,
    metadata,
    scheduled_for
  ) VALUES (
    'application_confirmation',
    NEW.contact_email,
    'Application Received - ' || NEW.organization_name,
    'normal',
    jsonb_build_object(
      'application_id', NEW.id,
      'organization_name', NEW.organization_name,
      'contact_person', NEW.contact_person,
      'dispensary_number', COALESCE(NEW.dispensary_number, 'Will be assigned upon review')
    ),
    NOW()
  );

  RETURN NEW;
END;
$$;

-- PHASE 2: PIPELINE HEALTH MONITORING
CREATE TABLE IF NOT EXISTS public.pipeline_health_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'critical')),
  error_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  last_error_message TEXT,
  metadata JSONB,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_health_log_checked_at ON public.pipeline_health_log(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_health_log_status ON public.pipeline_health_log(status) WHERE status IN ('degraded', 'critical');

-- RLS for pipeline_health_log
ALTER TABLE public.pipeline_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pipeline health"
ON public.pipeline_health_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert health logs"
ON public.pipeline_health_log
FOR INSERT
WITH CHECK (true);

-- Function to check stuck applications
CREATE OR REPLACE FUNCTION public.check_stuck_applications()
RETURNS TABLE(
  application_id UUID,
  organization_name TEXT,
  contact_email TEXT,
  status TEXT,
  hours_stuck INTEGER,
  last_updated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    da.id,
    da.organization_name,
    da.contact_email,
    da.application_status,
    EXTRACT(EPOCH FROM (NOW() - da.updated_at))::INTEGER / 3600 as hours_stuck,
    da.updated_at
  FROM public.dispensary_applications da
  WHERE da.application_status = 'pending'
    AND da.updated_at < NOW() - INTERVAL '48 hours'
  ORDER BY da.updated_at ASC;
END;
$$;

-- PHASE 5: PAYMENT PROCESSING TRACKING
ALTER TABLE public.dispensary_applications 
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'test')),
  ADD COLUMN IF NOT EXISTS payment_provider TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dispensary_applications_payment_status ON public.dispensary_applications(payment_status);

-- PHASE 6: SECURITY FIXES - Add search_path to existing functions
CREATE OR REPLACE FUNCTION public.log_security_event(_event_type text, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (
    user_id,
    event_type,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    _event_type,
    _details,
    NOW()
  );
END;
$$;

-- PHASE 7: TOKEN VALIDATION AND REGENERATION
CREATE OR REPLACE FUNCTION public.validate_registration_token(token_value TEXT)
RETURNS TABLE(
  is_valid BOOLEAN,
  application_id UUID,
  organization_id UUID,
  organization_name TEXT,
  expires_at TIMESTAMPTZ,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  app_record RECORD;
BEGIN
  SELECT 
    da.id,
    da.organization_id,
    da.organization_name,
    da.registration_token_expires_at,
    da.registration_completed
  INTO app_record
  FROM public.dispensary_applications da
  WHERE da.registration_token = token_value
    AND da.application_status = 'approved';

  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      FALSE,
      NULL::UUID,
      NULL::UUID,
      NULL::TEXT,
      NULL::TIMESTAMPTZ,
      'Invalid registration token'::TEXT;
    RETURN;
  END IF;

  IF app_record.registration_completed THEN
    RETURN QUERY SELECT 
      FALSE,
      app_record.id,
      app_record.organization_id,
      app_record.organization_name,
      app_record.registration_token_expires_at,
      'Registration already completed'::TEXT;
    RETURN;
  END IF;

  IF app_record.registration_token_expires_at < NOW() THEN
    RETURN QUERY SELECT 
      FALSE,
      app_record.id,
      app_record.organization_id,
      app_record.organization_name,
      app_record.registration_token_expires_at,
      'Registration token expired'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT 
    TRUE,
    app_record.id,
    app_record.organization_id,
    app_record.organization_name,
    app_record.registration_token_expires_at,
    NULL::TEXT;
END;
$$;

-- PHASE 8: ENHANCED TESTING FUNCTIONS
CREATE OR REPLACE FUNCTION public.run_pipeline_health_check()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stuck_apps INTEGER;
  orphaned_orgs INTEGER;
  stuck_notifications INTEGER;
  failed_emails INTEGER;
  health_status TEXT;
  health_details JSONB;
BEGIN
  -- Check stuck applications
  SELECT COUNT(*) INTO stuck_apps
  FROM public.dispensary_applications
  WHERE application_status = 'pending'
    AND updated_at < NOW() - INTERVAL '48 hours';

  -- Check orphaned organizations (approved but no org_id)
  SELECT COUNT(*) INTO orphaned_orgs
  FROM public.dispensary_applications
  WHERE application_status = 'approved'
    AND organization_id IS NULL
    AND reviewed_at < NOW() - INTERVAL '1 hour';

  -- Check stuck notifications
  SELECT COUNT(*) INTO stuck_notifications
  FROM public.notification_queue
  WHERE status = 'pending'
    AND scheduled_for < NOW() - INTERVAL '1 hour';

  -- Check failed emails in last hour
  SELECT COUNT(*) INTO failed_emails
  FROM public.email_logs
  WHERE delivery_status = 'failed'
    AND created_at > NOW() - INTERVAL '1 hour';

  -- Determine overall health
  IF stuck_apps > 0 OR orphaned_orgs > 0 THEN
    health_status := 'critical';
  ELSIF stuck_notifications > 10 OR failed_emails > 5 THEN
    health_status := 'degraded';
  ELSE
    health_status := 'healthy';
  END IF;

  health_details := jsonb_build_object(
    'status', health_status,
    'checks', jsonb_build_object(
      'stuck_applications', stuck_apps,
      'orphaned_organizations', orphaned_orgs,
      'stuck_notifications', stuck_notifications,
      'failed_emails', failed_emails
    ),
    'timestamp', NOW()
  );

  -- Log health check
  INSERT INTO public.pipeline_health_log (
    check_type,
    status,
    error_count,
    metadata,
    checked_at
  ) VALUES (
    'full_pipeline_check',
    health_status,
    stuck_apps + orphaned_orgs + stuck_notifications + failed_emails,
    health_details,
    NOW()
  );

  RETURN health_details;
END;
$$;

-- Schedule pipeline health checks (every 15 minutes)
SELECT cron.schedule(
  'pipeline-health-check',
  '*/15 * * * *',
  $$SELECT public.run_pipeline_health_check()$$
);