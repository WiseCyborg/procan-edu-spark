-- Add is_manager_only column to course_modules
ALTER TABLE public.course_modules
ADD COLUMN is_manager_only BOOLEAN DEFAULT false;

-- Create 5 manager-specific modules (19-23)
INSERT INTO public.course_modules (
  course_id,
  module_number,
  title,
  description,
  comar_reference,
  estimated_minutes,
  learning_objectives,
  stoplight_tier,
  is_active,
  is_manager_only
) VALUES
-- Module 19: Supervising Compliance
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  19,
  'Supervising Compliance Operations',
  'Learn how to oversee and enforce compliance standards as a dispensary manager, including team supervision, policy enforcement, and regulatory adherence.',
  'COMAR 14.17.05.02(A)(1-16)',
  45,
  '["Understand manager responsibilities for compliance oversight", "Learn to monitor and enforce SOPs", "Develop skills for identifying compliance gaps", "Implement corrective action procedures"]'::jsonb,
  'red',
  true,
  true
),
-- Module 20: Compliance Oversight & Reporting
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  20,
  'Compliance Oversight & Regulatory Reporting',
  'Master the skills required for regulatory oversight, inspection preparedness, and accurate compliance reporting to the Maryland Cannabis Administration.',
  'COMAR 14.17.05, COMAR 14.17.06',
  40,
  '["Prepare for MCA inspections and audits", "Understand reporting requirements and deadlines", "Learn to maintain compliance documentation", "Develop inspection response protocols"]'::jsonb,
  'red',
  true,
  true
),
-- Module 21: Team Training Coordination
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  21,
  'Team Training & Development Coordination',
  'Develop strategies for managing team training programs, tracking employee certifications, ensuring continuous education compliance, and coordinating RVT renewals.',
  'COMAR 14.17.15.05',
  35,
  '["Coordinate team training schedules and track progress", "Monitor certificate expirations and renewal deadlines", "Implement onboarding training programs", "Assess training effectiveness and identify gaps"]'::jsonb,
  'red',
  true,
  true
),
-- Module 22: Incident Documentation & Reporting
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  22,
  'Incident Documentation & Investigation',
  'Learn proper procedures for documenting incidents, conducting internal investigations, reporting to authorities, and implementing preventive measures.',
  'COMAR 14.17.05.02(A)(13-14)',
  40,
  '["Document security incidents and breaches", "Conduct thorough internal investigations", "Report incidents to MCA and appropriate authorities", "Implement corrective and preventive action plans"]'::jsonb,
  'red',
  true,
  true
),
-- Module 23: Advanced Diversion Prevention
(
  'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  23,
  'Advanced Diversion Prevention Strategies',
  'Advanced techniques for preventing cannabis diversion, detecting suspicious activity, implementing internal controls, and managing high-risk scenarios.',
  'COMAR 14.17.05.02(A)(10-11)',
  45,
  '["Identify diversion risk factors and red flags", "Implement advanced inventory control systems", "Detect and investigate suspicious patterns", "Develop comprehensive diversion prevention protocols"]'::jsonb,
  'red',
  true,
  true
);

-- Add certification_level to certificates table
ALTER TABLE public.certificates
ADD COLUMN certification_level TEXT DEFAULT 'agent' CHECK (certification_level IN ('agent', 'manager'));

-- Create index for manager-only modules query
CREATE INDEX idx_course_modules_manager_only ON public.course_modules(is_manager_only);

-- Update RLS policy for course_modules to include manager check
DROP POLICY IF EXISTS "Users can view modules with payment or seat" ON public.course_modules;

CREATE POLICY "Users can view modules with payment or seat"
ON public.course_modules
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND (
    -- Regular modules available to everyone with access
    (is_manager_only = false AND (
      EXISTS (
        SELECT 1 FROM payments
        WHERE payments.user_id = auth.uid()
        AND payments.course_id = course_modules.course_id
        AND payments.status = 'completed'
      )
      OR EXISTS (
        SELECT 1 FROM orders
        WHERE orders.user_id = auth.uid()
        AND orders.course_id = course_modules.course_id
        AND orders.status = 'completed'
      )
      OR EXISTS (
        SELECT 1 FROM rvt_seats
        WHERE rvt_seats.assigned_user_id = auth.uid()
        AND rvt_seats.course_id = course_modules.course_id
        AND rvt_seats.status IN ('assigned', 'used')
      )
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    ))
    OR
    -- Manager modules only for managers and admins
    (is_manager_only = true AND (
      EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('dispensary_manager', 'training_coordinator', 'admin')
      )
    ))
  )
);