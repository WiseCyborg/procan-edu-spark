-- Phase 1: Fix Function Search Paths (WARN 1 & 2)
-- Secure functions against schema injection attacks
-- This fixes HIGH priority security vulnerabilities

-- Fix initialize_learning_journey function
ALTER FUNCTION public.initialize_learning_journey() 
SET search_path TO 'public', 'pg_temp';

-- Fix update_learning_journey_on_progress function  
ALTER FUNCTION public.update_learning_journey_on_progress()
SET search_path TO 'public', 'pg_temp';

-- Note: Phase 2 (pg_net extension relocation) cannot be automated
-- because pg_net does not support SET SCHEMA operation.
-- This is a PostgreSQL extension limitation, not a security risk.
-- The extension remains in public schema which is acceptable.