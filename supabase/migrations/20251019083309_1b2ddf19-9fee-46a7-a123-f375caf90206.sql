-- Phase 1.1: Add training_coordinator role to enum (must be separate transaction)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'app_role' AND e.enumlabel = 'training_coordinator'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'training_coordinator';
  END IF;
END $$;