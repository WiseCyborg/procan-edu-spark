-- Fix module count mismatch in courses table
UPDATE courses 
SET 
  module_count = 24, 
  updated_at = now()
WHERE title ILIKE '%Maryland%RVT%' OR title ILIKE '%Responsible Vendor Training%';

-- Add a helpful comment
COMMENT ON COLUMN courses.module_count IS 'Total number of modules in course. Should match count of active course_modules records.';