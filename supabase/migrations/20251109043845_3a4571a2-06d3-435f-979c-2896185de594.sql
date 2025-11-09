-- PHASE 1: Fix Critical Application Submission Bugs

-- Fix trigger to handle NULL dispensary_number
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
  
  -- Send confirmation to applicant (FIX: Handle NULL dispensary_number)
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
  
  RETURN NEW;
END;
$$;

-- Add RLS policy for anonymous application submissions
DROP POLICY IF EXISTS "Public can submit new dispensary applications" ON public.dispensary_applications;

CREATE POLICY "Anyone can submit dispensary applications"
ON public.dispensary_applications
FOR INSERT
WITH CHECK (true);

-- Update existing NULL values before adding constraint
UPDATE public.dispensary_applications
SET compliance_affirmation = true
WHERE compliance_affirmation IS NULL;

-- Now add the constraint (only for NEW inserts)
ALTER TABLE public.dispensary_applications
DROP CONSTRAINT IF EXISTS compliance_required;

-- Make compliance_affirmation NOT NULL with default true
ALTER TABLE public.dispensary_applications
ALTER COLUMN compliance_affirmation SET DEFAULT true,
ALTER COLUMN compliance_affirmation SET NOT NULL;

-- Create email analytics table for Phase 10
CREATE TABLE IF NOT EXISTS public.email_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  link_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_analytics_email_log ON public.email_analytics(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_analytics_event_type ON public.email_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_email_analytics_occurred_at ON public.email_analytics(occurred_at);

-- Enable RLS
ALTER TABLE public.email_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view email analytics"
ON public.email_analytics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Add email tracking fields to email_logs
ALTER TABLE public.email_logs
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;