-- Enhance organizations table for dispensary-first model
ALTER TABLE public.organizations 
ADD COLUMN unique_access_key TEXT UNIQUE,
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN course_credits INTEGER DEFAULT 0,
ADD COLUMN admin_approved BOOLEAN DEFAULT false,
ADD COLUMN stripe_session_id TEXT,
ADD COLUMN stripe_customer_id TEXT;

-- Update profiles table to link students to organizations
ALTER TABLE public.profiles 
ADD COLUMN organization_id UUID REFERENCES public.organizations(id),
ADD COLUMN dispensary_access_key TEXT;

-- Create function to generate unique dispensary access keys
CREATE OR REPLACE FUNCTION public.generate_dispensary_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  access_key TEXT;
BEGIN
  access_key := 'DISP-' || TO_CHAR(NOW(), 'YYYY') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  RETURN access_key;
END;
$$;

-- Create dispensary applications table for admin approval workflow
CREATE TABLE public.dispensary_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  address TEXT,
  license_number TEXT,
  requested_credits INTEGER DEFAULT 10,
  application_status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ
);

-- Enable RLS on dispensary applications
ALTER TABLE public.dispensary_applications ENABLE ROW LEVEL SECURITY;

-- Policies for dispensary applications
CREATE POLICY "Admins can manage all applications" 
ON public.dispensary_applications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Service role can manage applications" 
ON public.dispensary_applications 
FOR ALL 
USING (true);

-- Update organizations policies to include admin management
CREATE POLICY "Admins can manage all organizations" 
ON public.organizations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Add trigger for updated_at on dispensary applications
CREATE TRIGGER update_dispensary_applications_updated_at
BEFORE UPDATE ON public.dispensary_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();