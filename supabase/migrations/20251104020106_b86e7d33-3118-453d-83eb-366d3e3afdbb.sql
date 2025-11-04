-- Phase 2: Security Hardening Migration
-- Fixes: system_jobs unauthenticated access, feature_flags public exposure,
-- and hardens service role policies on workflow_automations, notification_rules, rate_limits

-- ============================================
-- 1. Fix system_jobs - Remove Unauthenticated Access (CRITICAL)
-- ============================================
DROP POLICY IF EXISTS "System can manage jobs" ON public.system_jobs;

-- Service role can manage (edge functions need this)
CREATE POLICY "Service role manages system jobs"
  ON public.system_jobs
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ============================================
-- 2. Fix feature_flags - Restrict to Authenticated Users
-- ============================================
DROP POLICY IF EXISTS "Everyone can read feature flags" ON public.feature_flags;

-- Only authenticated users can read feature flags
CREATE POLICY "Authenticated users read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage feature flags (for edge function updates)
CREATE POLICY "Service role manages feature flags"
  ON public.feature_flags
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ============================================
-- 3. Harden workflow_automations Service Role Policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage workflow automations" ON public.workflow_automations;

CREATE POLICY "Service role manages workflow automations"
  ON public.workflow_automations
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ============================================
-- 4. Harden notification_rules Service Role Policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage all notification data" ON public.notification_rules;

CREATE POLICY "Service role manages notification rules"
  ON public.notification_rules
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- ============================================
-- 5. Harden rate_limits Service Role Policy
-- ============================================
DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits
  FOR ALL
  USING (current_setting('role') = 'service_role')
  WITH CHECK (current_setting('role') = 'service_role');

-- Admin read access for rate limits dashboard
CREATE POLICY "Admins view rate limits"
  ON public.rate_limits
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================
-- 6. Document pg_net Extension Exception
-- ============================================
-- NOTE: pg_net extension cannot be moved from public schema
-- This is a Supabase-managed extension required for net.http_* functions
-- The extension does not support SET SCHEMA operations
-- This is an acceptable security exception per Supabase architecture

COMMENT ON EXTENSION pg_net IS 
  'Supabase-managed extension for HTTP requests. Cannot be moved from public schema due to architectural limitations. Required for edge function HTTP calls. Acceptable security exception.';
