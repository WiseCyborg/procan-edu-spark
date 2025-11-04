-- ========================================
-- CRITICAL SECURITY FIX - CORRECTED VERSION
-- Fixes: PUBLIC_NOTIFICATION_DATA, PUBLIC_COURSE_CONTENT, MISSING_RLS, SECURITY_DEFINER_VIEW
-- ========================================

-- 1. FIX notification_queue - Remove public access
DROP POLICY "Service role can manage notification queue" ON public.notification_queue;

CREATE POLICY "Service role manages notification queue"
  ON public.notification_queue
  FOR ALL
  TO service_role
  USING (true);

-- 2. FIX course_modules - Remove public access
DROP POLICY "Service role can manage modules" ON public.course_modules;

CREATE POLICY "Service role manages course modules"
  ON public.course_modules
  FOR ALL
  TO service_role
  USING (true);

-- 3. ENHANCE course_modules user policy with RVT seat validation
DROP POLICY "Users can view modules for purchased courses" ON public.course_modules;

CREATE POLICY "Users can view modules with payment or seat"
  ON public.course_modules
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      EXISTS (
        SELECT 1 FROM public.payments
        WHERE user_id = auth.uid()
          AND course_id = course_modules.course_id
          AND status = 'completed'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.orders
        WHERE user_id = auth.uid()
          AND course_id = course_modules.course_id
          AND status = 'completed'
      )
      OR
      EXISTS (
        SELECT 1 FROM public.rvt_seats
        WHERE assigned_user_id = auth.uid()
          AND course_id = course_modules.course_id
          AND status IN ('assigned', 'used')
      )
      OR
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role = 'admin'::app_role
      )
    )
  );

-- 4. ENABLE RLS on email_circuit_breaker
ALTER TABLE public.email_circuit_breaker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view circuit breaker"
  ON public.email_circuit_breaker
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

CREATE POLICY "Service role manages circuit breaker"
  ON public.email_circuit_breaker
  FOR ALL
  TO service_role
  USING (true);

-- 5. ENABLE RLS on slo_metrics
ALTER TABLE public.slo_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view slo metrics"
  ON public.slo_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'::app_role
    )
  );

CREATE POLICY "Service role manages slo metrics"
  ON public.slo_metrics
  FOR ALL
  TO service_role
  USING (true);

-- 6. FIX security definer views - Use correct column names
DROP VIEW IF EXISTS public.v_queue_health CASCADE;
DROP VIEW IF EXISTS public.v_processor_pulse CASCADE;

CREATE VIEW public.v_queue_health
WITH (security_invoker = true)
AS
SELECT 
  COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
  COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
  MAX(queued_at) as last_job_queued_at,
  EXTRACT(EPOCH FROM (NOW() - MIN(queued_at) FILTER (WHERE status = 'queued')))::integer as oldest_queued_age_seconds
FROM public.system_jobs
WHERE queued_at > NOW() - INTERVAL '24 hours';

CREATE VIEW public.v_processor_pulse
WITH (security_invoker = true)
AS
SELECT 
  job_type,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (completed_at - queued_at)))::integer as avg_processing_seconds
FROM public.system_jobs
WHERE queued_at > NOW() - INTERVAL '1 hour'
GROUP BY job_type;