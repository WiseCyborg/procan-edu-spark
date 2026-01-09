-- Fix overly permissive RLS policies that allow public INSERT with true
-- These should be restricted to service role or specific authenticated checks

-- 1. Fix admin_operations_audit - only admins should insert
DROP POLICY IF EXISTS "Service role inserts audit logs" ON public.admin_operations_audit;
CREATE POLICY "Admins can insert audit logs" 
  ON public.admin_operations_audit 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 2. Fix api_console_audit - restrict to authenticated admins only
DROP POLICY IF EXISTS "Service role manages audit" ON public.api_console_audit;
CREATE POLICY "Admins can insert api audit logs" 
  ON public.api_console_audit 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. Fix notification_queue - allow authenticated users to insert their own notifications
DROP POLICY IF EXISTS "Allow trigger functions to insert notifications" ON public.notification_queue;
CREATE POLICY "Users can insert their own notifications" 
  ON public.notification_queue 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- 4. Fix pipeline_health_log - restrict to authenticated admins
DROP POLICY IF EXISTS "Service role can insert health logs" ON public.pipeline_health_log;
CREATE POLICY "Admins can insert health logs" 
  ON public.pipeline_health_log 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 5. Fix user_activity_log - users can log their own activity
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.user_activity_log;
CREATE POLICY "Users can insert their own activity logs" 
  ON public.user_activity_log 
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
  );

-- Note: dispensary_applications "Anyone can submit dispensary applications" is intentionally public
-- for unauthenticated users to submit applications - this is the expected behavior