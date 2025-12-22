-- Fix: Allow applications to be approved even if preferred_start_date has passed
-- The constraint should only validate on INSERT, not UPDATE

-- Drop the problematic check constraint
ALTER TABLE dispensary_applications
DROP CONSTRAINT IF EXISTS check_preferred_start_date;

-- Create a trigger function that only validates preferred_start_date on INSERT
CREATE OR REPLACE FUNCTION check_preferred_start_date_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate on INSERT, not UPDATE
  IF TG_OP = 'INSERT' AND NEW.preferred_start_date IS NOT NULL AND NEW.preferred_start_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'preferred_start_date must be today or in the future';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS check_preferred_start_date_trigger ON dispensary_applications;

-- Create trigger for INSERT only
CREATE TRIGGER check_preferred_start_date_trigger
BEFORE INSERT ON dispensary_applications
FOR EACH ROW EXECUTE FUNCTION check_preferred_start_date_on_insert();