
-- First, drop the old check constraint and add one that includes 'Dual License' and 'dual'
ALTER TABLE dispensary_applications DROP CONSTRAINT IF EXISTS dispensary_applications_license_type_check;

ALTER TABLE dispensary_applications ADD CONSTRAINT dispensary_applications_license_type_check 
CHECK ((license_type IS NULL) OR (license_type = ANY (ARRAY['dispensary', 'processor', 'grower', 'dual', 'Dual License', 'other'])));

-- Fix 1: Add search_path to functions missing it
CREATE OR REPLACE FUNCTION public.update_ailean_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_competitor_snapshots_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix 2: Regenerate expired registration tokens (4 records)
UPDATE dispensary_applications
SET 
  registration_token = encode(extensions.gen_random_bytes(32), 'hex'),
  registration_token_expires_at = NOW() + INTERVAL '30 days',
  updated_at = NOW()
WHERE registration_token_expires_at < NOW() 
  AND registration_completed = false
  AND application_status = 'approved';

-- Fix 3: Add license number to Hendricks Compliance org (Louis's test org)
UPDATE organizations
SET license_number = 'TEST-HC-2024-001'
WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
  AND license_number IS NULL;
