-- Update courses table policy to restrict pricing visibility
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;

-- Create more restrictive policies for courses
CREATE POLICY "Unauthenticated users can view basic course info" 
ON public.courses 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NULL);

CREATE POLICY "Authenticated users can view full course details" 
ON public.courses 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all courses" 
ON public.courses 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Note: We'll handle pricing visibility in the application layer by 
-- conditionally showing pricing fields based on authentication status