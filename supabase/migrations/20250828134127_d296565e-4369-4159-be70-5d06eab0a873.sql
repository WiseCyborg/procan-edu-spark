-- CRITICAL SECURITY FIX: Protect Proprietary Training Content
-- Remove public access to course modules and implement proper access controls

-- Drop the dangerous public access policy
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

-- Keep service role access for backend management
-- (This policy already exists, just ensuring it's documented)

-- Add audit logging for course module access attempts
CREATE OR REPLACE FUNCTION log_course_access_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone tries to access course content
  INSERT INTO security_audit_log (
    user_id,
    action_type,
    table_name,
    record_id,
    new_values,
    ip_address
  ) VALUES (
    auth.uid(),
    'course_module_access',
    'course_modules',
    NEW.id,
    jsonb_build_object(
      'course_id', NEW.course_id,
      'module_number', NEW.module_number,
      'title', NEW.title
    ),
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for access logging
DROP TRIGGER IF EXISTS course_module_access_log ON public.course_modules;
CREATE TRIGGER course_module_access_log
  AFTER SELECT ON public.course_modules
  FOR EACH ROW
  EXECUTE FUNCTION log_course_access_attempt();