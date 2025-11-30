-- ================================================================
-- PRODUCTION READINESS: Feature Flags & Database Security Fixes
-- ================================================================

-- 1. Add Production Feature Flags
INSERT INTO admin_settings (setting_key, setting_value, description, updated_by)
VALUES 
  ('email_fallback_smtp_enabled', 'true'::jsonb, 'Enable SMTP fallback for email delivery resilience', auth.uid()),
  ('paypal_sandbox_mode', 'true'::jsonb, 'PayPal sandbox mode (set to false for production)', auth.uid())
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. Fix Database Linter Warnings - Add search_path to functions missing it
-- These functions were identified in linter warnings as needing explicit search_path

-- Fix: handle_new_dispensary_application trigger
CREATE OR REPLACE FUNCTION public.handle_new_dispensary_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  admin_notification_count INTEGER := 0;
  applicant_notification_success BOOLEAN := false;
BEGIN
  -- Try to insert admin notifications (NON-BLOCKING)
  BEGIN
    INSERT INTO public.notification_queue (
      recipient_email,
      subject,
      message,
      scheduled_for,
      priority,
      metadata
    )
    SELECT 
      au.email,
      'New Dispensary Application Pending Review',
      'Organization: ' || NEW.organization_name || E'\nContact: ' || NEW.contact_person || E'\nEmail: ' || NEW.contact_email || E'\nLicense: ' || COALESCE(NEW.license_number, 'Not Provided') || E'\n\nPlease review at /admin-management',
      NOW(),
      'high',
      jsonb_build_object(
        'application_id', NEW.id,
        'organization_name', NEW.organization_name,
        'contact_person', NEW.contact_person,
        'review_url', '/admin-management'
      )
    FROM auth.users au
    JOIN public.user_roles ur ON ur.user_id = au.id
    WHERE ur.role = 'admin'::app_role;
    
    GET DIAGNOSTICS admin_notification_count = ROW_COUNT;
    RAISE NOTICE 'Created % admin notifications for application %', admin_notification_count, NEW.id;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create admin notifications for application %: % %', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  -- Try to send confirmation to applicant (NON-BLOCKING)
  BEGIN
    INSERT INTO public.notification_queue (
      recipient_email,
      subject,
      message,
      scheduled_for,
      priority,
      metadata
    ) VALUES (
      NEW.contact_email,
      'Application Received - ProCann Edu RVT Program',
      'Dear ' || NEW.contact_person || E',\n\nThank you for applying to the ProCann Edu Responsible Vendor Training program!\n\nYour application for ' || NEW.organization_name || ' has been received and is under review.\n\nOur team will review your application within 24-48 business hours. You will receive an email notification once your application has been processed.\n\nApplication Details:\n- Organization: ' || NEW.organization_name || E'\n- License Number: ' || COALESCE(NEW.license_number, 'Not Provided') || E'\n- Application Status: Pending Review' || E'\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nProCann Edu Team',
      NOW(),
      'normal',
      jsonb_build_object(
        'application_id', NEW.id,
        'status', 'pending'
      )
    );
    
    applicant_notification_success := true;
    RAISE NOTICE 'Created applicant confirmation notification for %', NEW.contact_email;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create applicant notification for application %: % %', NEW.id, SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
END;
$function$;

-- Fix: set_exam_retake_time trigger
CREATE OR REPLACE FUNCTION public.set_exam_retake_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.can_retake_at := NEW.created_at + (COALESCE(NEW.retake_cooldown_hours, 24) || ' hours')::INTERVAL;
  RETURN NEW;
END;
$function$;

-- Fix: update_impact_tracking_updated_at trigger
CREATE OR REPLACE FUNCTION public.update_impact_tracking_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. Log configuration changes
INSERT INTO api_console_audit (
  api_route,
  command,
  success,
  user_role,
  request_params,
  response_data
) VALUES (
  '/database/migration',
  'production_readiness_fixes',
  true,
  'admin',
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'email_fallback_smtp_enabled',
      'paypal_sandbox_mode',
      'function_search_path_fixes'
    ]
  ),
  jsonb_build_object(
    'timestamp', NOW(),
    'message', 'Production readiness fixes applied'
  )
);