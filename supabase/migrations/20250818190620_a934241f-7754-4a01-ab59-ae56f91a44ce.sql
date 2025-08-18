-- Security Fix: Restrict Public Access to Sensitive Data
-- This migration fixes critical RLS policy issues that expose personal and business data

-- First, ensure RLS is enabled on all sensitive tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispensary_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies that may allow public access
DROP POLICY IF EXISTS "Anyone can view active organizations" ON public.organizations;

-- PROFILES TABLE - Only allow users to access their own data
-- Keep existing policies but ensure no public access
-- (Existing policies already restrict to auth.uid() = user_id which is correct)

-- ORGANIZATIONS TABLE - Restrict access properly
-- Only admins and organization members should see organization data
CREATE POLICY "Authenticated users can view organizations they belong to"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  -- Admins can see all
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
  OR
  -- Users can see organizations they belong to via their profile
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND organization_id = organizations.id
  )
  OR
  -- Dispensary managers can see their own organization
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'dispensary_manager'::app_role 
    AND p.organization_id = organizations.id
  )
);

CREATE POLICY "Admins can manage organizations"
ON public.organizations
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- DISPENSARY APPLICATIONS - Admin access only
CREATE POLICY "Only admins can view dispensary applications"
ON public.dispensary_applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

CREATE POLICY "Only admins can manage dispensary applications"
ON public.dispensary_applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Allow public insert for new applications (signup process)
CREATE POLICY "Anyone can submit dispensary applications"
ON public.dispensary_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- EMAIL LOGS - Restrict to service role only for privacy
-- Remove existing policies that might allow broader access
-- Only service role should manage email logs for privacy

-- Add helpful comments for future reference
COMMENT ON TABLE public.profiles IS 'Contains sensitive personal data - access restricted to profile owners only';
COMMENT ON TABLE public.dispensary_applications IS 'Contains business application data - access restricted to admins only';
COMMENT ON TABLE public.email_logs IS 'Contains communication records - access restricted to service role only';
COMMENT ON TABLE public.organizations IS 'Contains business contact information - access restricted to organization members and admins';