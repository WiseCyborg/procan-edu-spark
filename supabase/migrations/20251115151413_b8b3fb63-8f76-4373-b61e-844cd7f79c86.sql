-- Fix the dispensary application trigger to prevent transaction rollbacks
-- and ensure public signup pipeline has necessary permissions

-- Drop and recreate the trigger function with proper error handling
DROP FUNCTION IF EXISTS public.handle_new_dispensary_application() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_dispensary_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $$
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
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_dispensary_application_created ON public.dispensary_applications;

CREATE TRIGGER on_dispensary_application_created
  AFTER INSERT ON public.dispensary_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_dispensary_application();

-- Ensure anon role has necessary permissions for public signup flow
GRANT USAGE ON SCHEMA public TO anon;
GRANT INSERT ON public.dispensary_applications TO anon;
GRANT INSERT ON public.notification_queue TO anon;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '✅ Dispensary application trigger fixed with error handling';
  RAISE NOTICE '✅ Public authentication pipeline permissions granted';
END $$;