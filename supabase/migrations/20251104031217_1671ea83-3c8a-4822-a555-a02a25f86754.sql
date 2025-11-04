-- ==========================================
-- Security Fix: API Requests Exposure & PostgREST Cache Reload
-- ==========================================

-- Part 1: Fix API Requests Exposure
-- Drop the dangerous policy that allows anonymous access
DROP POLICY IF EXISTS "System can manage API requests" ON public.api_requests;

-- Create service role-only policy (edge functions can still write)
CREATE POLICY "Service role manages API requests"
  ON public.api_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Part 2: Force PostgREST Schema Cache Reload
-- Send NOTIFY signal to PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Update function comment to force cache invalidation
COMMENT ON FUNCTION public.get_jobs_to_process(int) IS 
  'Fetches jobs ready for processing - Updated 2025-11-04 03:15 UTC';