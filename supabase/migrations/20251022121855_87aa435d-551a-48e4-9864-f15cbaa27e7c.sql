-- Fix handle_new_dispensary_application trigger to handle NULL values safely
CREATE OR REPLACE FUNCTION public.handle_new_dispensary_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin notifications for all admins
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
    'Organization: ' || COALESCE(NEW.organization_name, 'N/A') || 
    E'\nContact: ' || COALESCE(NEW.contact_person, 'N/A') || 
    E'\nEmail: ' || COALESCE(NEW.contact_email, 'N/A') || 
    E'\nLicense: ' || COALESCE(NEW.license_number, 'N/A') || 
    E'\n\nPlease review at /admin-management',
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
  
  -- Send confirmation to applicant (with NULL-safe concatenation)
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
    'Dear ' || COALESCE(NEW.contact_person, 'Applicant') || 
    E',\n\nThank you for applying to the ProCann Edu Responsible Vendor Training program!' ||
    E'\n\nYour application for ' || COALESCE(NEW.organization_name, 'your organization') || 
    ' has been received and is under review.' ||
    E'\n\nOur team will review your application within 24-48 business hours. You will receive an email notification once your application has been processed.' ||
    E'\n\nApplication Details:' ||
    E'\n- Organization: ' || COALESCE(NEW.organization_name, 'N/A') ||
    E'\n- License Number: ' || COALESCE(NEW.license_number, 'N/A') ||
    CASE 
      WHEN NEW.dispensary_number IS NOT NULL 
      THEN E'\n- Application Number: ' || NEW.dispensary_number
      ELSE E'\n- Application Number: Will be assigned upon approval'
    END ||
    E'\n\nIf you have any questions, please contact our support team.' ||
    E'\n\nBest regards,' ||
    E'\nProCann Edu Team',
    NOW(),
    'normal',
    jsonb_build_object(
      'application_id', NEW.id,
      'status', 'pending',
      'dispensary_number', NEW.dispensary_number
    )
  );
  
  RETURN NEW;
END;
$$;