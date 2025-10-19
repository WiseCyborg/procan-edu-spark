-- Phase 1: Add missing columns to dispensary_applications table
ALTER TABLE public.dispensary_applications 
ADD COLUMN IF NOT EXISTS dba_name TEXT,
ADD COLUMN IF NOT EXISTS legal_entity_name TEXT,
ADD COLUMN IF NOT EXISTS license_type TEXT CHECK (license_type IN ('Adult Use', 'Medical', 'Dual License')),
ADD COLUMN IF NOT EXISTS license_issue_date DATE,
ADD COLUMN IF NOT EXISTS license_expiry_date DATE,
ADD COLUMN IF NOT EXISTS estimated_employees INTEGER CHECK (estimated_employees > 0),
ADD COLUMN IF NOT EXISTS preferred_start_date DATE,
ADD COLUMN IF NOT EXISTS compliance_affirmation BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS dispensary_number TEXT UNIQUE;

-- Create index for dispensary_number lookups
CREATE INDEX IF NOT EXISTS idx_dispensary_applications_dispensary_number 
ON public.dispensary_applications(dispensary_number);

-- Add date validation constraints
ALTER TABLE public.dispensary_applications
DROP CONSTRAINT IF EXISTS check_license_dates;

ALTER TABLE public.dispensary_applications
ADD CONSTRAINT check_license_dates 
CHECK (
  license_expiry_date IS NULL 
  OR license_issue_date IS NULL 
  OR license_expiry_date > license_issue_date
);

ALTER TABLE public.dispensary_applications
DROP CONSTRAINT IF EXISTS check_preferred_start_date;

ALTER TABLE public.dispensary_applications
ADD CONSTRAINT check_preferred_start_date
CHECK (preferred_start_date IS NULL OR preferred_start_date >= CURRENT_DATE);

-- Add documentation
COMMENT ON COLUMN public.dispensary_applications.dispensary_number IS 'Auto-generated on approval: DISP-MD-YYYY-XXXX';

-- Phase 2: Fix Profile Update RLS Policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Phase 3: Create/Update generate_dispensary_number function
CREATE OR REPLACE FUNCTION public.generate_dispensary_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  counter INTEGER := 1;
  year_code TEXT;
BEGIN
  year_code := TO_CHAR(NOW(), 'YYYY');
  
  LOOP
    new_number := 'DISP-MD-' || year_code || '-' || LPAD(counter::TEXT, 4, '0');
    
    -- Check both tables to ensure global uniqueness
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.organizations WHERE dispensary_number = new_number
      UNION ALL
      SELECT 1 FROM public.dispensary_applications WHERE dispensary_number = new_number
    );
    
    counter := counter + 1;
    
    -- Safety check: prevent infinite loops
    IF counter > 9999 THEN
      RAISE EXCEPTION 'Exhausted dispensary numbers for year %', year_code;
    END IF;
  END LOOP;
  
  RETURN new_number;
END;
$$;