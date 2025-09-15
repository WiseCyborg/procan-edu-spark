-- Fix security vulnerabilities by restricting access to sensitive data

-- 1. Fix dispensary_applications table - remove existing policies and create new ones
DROP POLICY IF EXISTS "Anyone can submit dispensary applications" ON public.dispensary_applications;
DROP POLICY IF EXISTS "Only admins can view dispensary applications" ON public.dispensary_applications;
DROP POLICY IF EXISTS "Only admins can manage dispensary applications" ON public.dispensary_applications;
DROP POLICY IF EXISTS "Admins can manage dispensary applications" ON public.dispensary_applications;
DROP POLICY IF EXISTS "Admins can manage all applications" ON public.dispensary_applications;
DROP POLICY IF EXISTS "Service role can manage applications" ON public.dispensary_applications;

CREATE POLICY "Admins can manage all dispensary applications" 
ON public.dispensary_applications 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Public can submit new dispensary applications" 
ON public.dispensary_applications 
FOR INSERT 
WITH CHECK (true);

-- 2. Fix email_logs table - remove existing policies and create new ones
DROP POLICY IF EXISTS "Admins can view email logs" ON public.email_logs;
DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_logs;

CREATE POLICY "Admins can view all email logs" 
ON public.email_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Service role can manage all email logs" 
ON public.email_logs 
FOR ALL 
USING (current_setting('role') = 'service_role');

-- 3. Fix user_roles table - remove existing policies and create new ones
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only service role can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view only their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (current_setting('role') = 'service_role');