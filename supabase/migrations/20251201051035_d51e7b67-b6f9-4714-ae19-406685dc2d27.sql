-- Clean up incomplete consumer courses to allow fresh recreation
-- This migration removes any partially created consumer courses and their modules

-- Delete modules for consumer courses first (foreign key constraint)
DELETE FROM course_modules 
WHERE course_id IN (
  SELECT id FROM courses WHERE course_type = 'consumer'
);

-- Delete consumer courses
DELETE FROM courses WHERE course_type = 'consumer';

-- Add comment for audit trail
COMMENT ON TABLE courses IS 'Consumer courses cleaned up and ready for recreation with complete module content';