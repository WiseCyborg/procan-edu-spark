-- Fix search path for functions using gen_random_bytes from pgcrypto extension
-- Issue: Functions set to search_path='public' cannot find gen_random_bytes in 'extensions' schema

-- Fix approve_dispensary_application
ALTER FUNCTION public.approve_dispensary_application(uuid, integer, uuid)
  SET search_path TO 'public', 'extensions';

-- Fix create_test_organization
ALTER FUNCTION public.create_test_organization(text, text, integer)
  SET search_path TO 'public', 'extensions';

-- Verify the fix
COMMENT ON FUNCTION public.approve_dispensary_application IS 
  'Approves dispensary applications with atomic seat allocation. Search path includes extensions for gen_random_bytes()';

COMMENT ON FUNCTION public.create_test_organization IS 
  'Creates test organizations for testing purposes. Search path includes extensions for gen_random_bytes()';