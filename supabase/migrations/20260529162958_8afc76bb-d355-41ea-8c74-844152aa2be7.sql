
-- Fix 1: Repair RLS policies that say "Service role can manage X" but were
-- accidentally granted to role `public`. This let unauthenticated/authenticated
-- clients UPDATE/DELETE/INSERT on these sensitive tables.
-- We drop the broken policies and recreate them properly scoped to service_role.

DROP POLICY IF EXISTS "Service role can manage certificates" ON public.certificates;
CREATE POLICY "Service role can manage certificates"
  ON public.certificates
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage communication logs" ON public.communication_logs;
CREATE POLICY "Service role can manage communication logs"
  ON public.communication_logs
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage courses" ON public.courses;
CREATE POLICY "Service role can manage courses"
  ON public.courses
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage topic scores" ON public.exam_topic_scores;
CREATE POLICY "Service role can manage topic scores"
  ON public.exam_topic_scores
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage orders" ON public.orders;
CREATE POLICY "Service role can manage orders"
  ON public.orders
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage payments" ON public.payments;
CREATE POLICY "Service role can manage payments"
  ON public.payments
  AS PERMISSIVE FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Fix 2: Set security_invoker=true on views that were inheriting the creator's
-- privileges (postgres superuser), which bypasses RLS on underlying tables.
ALTER VIEW public.unified_audit_timeline SET (security_invoker = true);
ALTER VIEW public.payment_audit_user_hint SET (security_invoker = true);
ALTER VIEW public.org_certification_summary SET (security_invoker = true);
