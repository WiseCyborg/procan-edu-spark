-- Fix RLS on system tables (these are admin-only tables)
ALTER TABLE public.system_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_jobs_deadletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Create RLS policies: Only admins can access these tables
CREATE POLICY "Admins can view system jobs"
  ON public.system_jobs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage jobs"
  ON public.system_jobs FOR ALL
  USING (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view deadletter"
  ON public.system_jobs_deadletter FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view API requests"
  ON public.api_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can manage API requests"
  ON public.api_requests FOR ALL
  USING (auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Everyone can read feature flags"
  ON public.feature_flags FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage feature flags"
  ON public.feature_flags FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Move pg_cron to extensions schema (best practice)
DROP EXTENSION IF EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;