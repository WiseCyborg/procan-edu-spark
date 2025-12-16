-- Drop the existing constraint completely
ALTER TABLE dispensary_applications 
DROP CONSTRAINT IF EXISTS dispensary_applications_license_type_check;

-- Add new constraint with NOT VALID to skip validation of existing rows
ALTER TABLE dispensary_applications 
ADD CONSTRAINT dispensary_applications_license_type_check 
CHECK (license_type IS NULL OR license_type = ANY (ARRAY[
  'dispensary'::text, 
  'processor'::text, 
  'grower'::text, 
  'other'::text
])) NOT VALID;