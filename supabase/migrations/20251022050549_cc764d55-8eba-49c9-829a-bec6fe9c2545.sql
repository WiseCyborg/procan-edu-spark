-- Create trigger function to handle new dispensary applications
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
    'Organization: ' || NEW.organization_name || E'\nContact: ' || NEW.contact_person || E'\nEmail: ' || NEW.contact_email || E'\nLicense: ' || NEW.license_number || E'\n\nPlease review at /admin-management',
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
  
  -- Send confirmation to applicant
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
    'Dear ' || NEW.contact_person || E',\n\nThank you for applying to the ProCann Edu Responsible Vendor Training program!\n\nYour application for ' || NEW.organization_name || ' has been received and is under review.\n\nOur team will review your application within 24-48 business hours. You will receive an email notification once your application has been processed.\n\nApplication Details:\n- Organization: ' || NEW.organization_name || E'\n- License Number: ' || NEW.license_number || E'\n- Application Number: ' || NEW.dispensary_number || E'\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nProCann Edu Team',
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

-- Attach trigger to dispensary_applications table
DROP TRIGGER IF EXISTS on_dispensary_application_submitted ON public.dispensary_applications;

CREATE TRIGGER on_dispensary_application_submitted
  AFTER INSERT ON public.dispensary_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_dispensary_application();