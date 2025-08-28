-- CRITICAL SECURITY FIX: Protect Proprietary Training Content
-- Remove public access to course modules and implement proper access controls

-- Drop the dangerous public access policy that allows anyone to steal course content
DROP POLICY IF EXISTS "Anyone can view active course modules" ON public.course_modules;

-- Create secure access policies for course modules
CREATE POLICY "Users can view modules for purchased courses" ON public.course_modules
FOR SELECT USING (
  is_active = true AND (
    -- User has completed payment for this course
    EXISTS (
      SELECT 1 FROM payments 
      WHERE user_id = auth.uid() 
      AND course_id = course_modules.course_id 
      AND status = 'completed'
    )
    OR
    -- User has a completed order for this course
    EXISTS (
      SELECT 1 FROM orders 
      WHERE user_id = auth.uid() 
      AND course_id = course_modules.course_id 
      AND status = 'completed'
    )
    OR
    -- Admin access
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  )
);

-- Service role can still manage modules (existing policy remains)
-- This ensures backend functions can still work properly