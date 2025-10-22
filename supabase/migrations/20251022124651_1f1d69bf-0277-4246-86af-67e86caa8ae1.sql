-- Add organization_id to track which organization was created from each application
ALTER TABLE dispensary_applications 
ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- Add index for faster lookups
CREATE INDEX idx_applications_organization_id ON dispensary_applications(organization_id);

-- Add comment
COMMENT ON COLUMN dispensary_applications.organization_id IS 'Links application to the organization created upon approval';

-- Update the approve_dispensary_application function to save organization_id
CREATE OR REPLACE FUNCTION public.approve_dispensary_application(application_id uuid, credits integer DEFAULT 10)
 RETURNS TABLE(success boolean, message text, organization_id uuid, access_key text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  app_record RECORD;
  new_org_id UUID;
  generated_key TEXT;
BEGIN
  -- Check if current user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Get application details
  SELECT * INTO app_record
  FROM public.dispensary_applications
  WHERE id = application_id AND application_status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Application not found or already processed'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate unique access key
  generated_key := public.generate_dispensary_key();

  -- Create organization
  INSERT INTO public.organizations (
    name,
    contact_person,
    contact_email,
    contact_phone,
    address,
    license_number,
    unique_access_key,
    course_credits,
    admin_approved,
    payment_status
  ) VALUES (
    app_record.organization_name,
    app_record.contact_person,
    app_record.contact_email,
    app_record.contact_phone,
    app_record.address,
    app_record.license_number,
    generated_key,
    credits,
    true,
    'approved'
  ) RETURNING id INTO new_org_id;

  -- Update application status AND link to organization
  UPDATE public.dispensary_applications
  SET 
    application_status = 'approved',
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    organization_id = new_org_id,
    admin_notes = COALESCE(admin_notes, '') || ' - Approved and organization created with ' || credits || ' credits'
  WHERE id = application_id;

  RETURN QUERY SELECT TRUE, 'Application approved and organization created successfully'::TEXT, new_org_id, generated_key;
END;
$function$;