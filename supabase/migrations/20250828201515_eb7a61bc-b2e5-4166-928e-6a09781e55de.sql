-- Create a secure view for public course information without pricing
CREATE OR REPLACE VIEW public.course_catalog AS
SELECT 
  id,
  title,
  description,
  module_count,
  passing_score,
  is_active,
  created_at,
  updated_at
FROM public.courses
WHERE is_active = true;

-- Enable RLS on the view
ALTER VIEW public.course_catalog ENABLE ROW LEVEL SECURITY;

-- Create policy for public course catalog access
CREATE POLICY "Anyone can view course catalog" 
ON public.course_catalog 
FOR SELECT 
USING (true);

-- Update courses table policy to be more restrictive
DROP POLICY IF EXISTS "Anyone can view active courses" ON public.courses;

CREATE POLICY "Authenticated users can view courses with pricing" 
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