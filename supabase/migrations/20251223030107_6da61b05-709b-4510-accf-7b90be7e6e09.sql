-- Add payment_testing_section column to uat_validation_checklists
ALTER TABLE public.uat_validation_checklists 
ADD COLUMN IF NOT EXISTS payment_testing_section JSONB DEFAULT '{}'::jsonb;