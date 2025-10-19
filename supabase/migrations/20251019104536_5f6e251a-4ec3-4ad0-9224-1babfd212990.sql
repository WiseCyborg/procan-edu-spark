-- Add default value for state column
ALTER TABLE public.profiles 
ALTER COLUMN state SET DEFAULT 'Maryland';

-- Add constraint to prevent empty strings (treat as NULL for validation)
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_no_empty_strings 
CHECK (
  (first_name IS NULL OR trim(first_name) != '') AND
  (last_name IS NULL OR trim(last_name) != '') AND
  (phone IS NULL OR trim(phone) != '') AND
  (organization IS NULL OR trim(organization) != '') AND
  (job_title IS NULL OR trim(job_title) != '')
);

-- Update existing empty strings to NULL
UPDATE public.profiles
SET 
  first_name = NULLIF(trim(first_name), ''),
  last_name = NULLIF(trim(last_name), ''),
  phone = NULLIF(trim(phone), ''),
  organization = NULLIF(trim(organization), ''),
  job_title = NULLIF(trim(job_title), ''),
  address = NULLIF(trim(address), ''),
  city = NULLIF(trim(city), ''),
  state = NULLIF(trim(state), ''),
  zip_code = NULLIF(trim(zip_code), ''),
  emergency_contact_name = NULLIF(trim(emergency_contact_name), ''),
  emergency_contact_phone = NULLIF(trim(emergency_contact_phone), '')
WHERE 
  trim(COALESCE(first_name, '')) = '' OR
  trim(COALESCE(last_name, '')) = '' OR
  trim(COALESCE(phone, '')) = '' OR
  trim(COALESCE(organization, '')) = '' OR
  trim(COALESCE(job_title, '')) = '' OR
  trim(COALESCE(address, '')) = '' OR
  trim(COALESCE(city, '')) = '' OR
  trim(COALESCE(state, '')) = '' OR
  trim(COALESCE(zip_code, '')) = '' OR
  trim(COALESCE(emergency_contact_name, '')) = '' OR
  trim(COALESCE(emergency_contact_phone, '')) = '';