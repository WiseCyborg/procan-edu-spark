-- ==========================================
-- Phase 3A-B: Create Missing RPC Function
-- Fix: jobs_processor_rpc_missing
-- ==========================================

-- Create the RPC function for jobs processing
-- This allows the jobs-processor edge function to fetch jobs server-side
CREATE OR REPLACE FUNCTION public.get_jobs_to_process(batch_size int DEFAULT 10)
RETURNS SETOF public.system_jobs
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.system_jobs
  WHERE status = 'queued'
     OR (status = 'failed'
         AND COALESCE(next_retry_at, now() - interval '1 year') < now()
         AND retry_count < max_retries)
  ORDER BY queued_at ASC NULLS FIRST
  LIMIT batch_size;
$$;

-- Add performance index for jobs processing
CREATE INDEX IF NOT EXISTS idx_system_jobs_processing
  ON public.system_jobs(status, next_retry_at, retry_count, queued_at);

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.get_jobs_to_process(int) TO service_role;

-- Verify the function was created successfully
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_jobs_to_process'
  ) THEN
    RAISE EXCEPTION 'Function get_jobs_to_process was not created successfully';
  END IF;
END $$;