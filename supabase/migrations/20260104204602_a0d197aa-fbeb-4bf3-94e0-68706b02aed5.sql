
-- 1) Revoke anon/public access from communication_logs
REVOKE ALL ON public.communication_logs FROM anon;
REVOKE ALL ON public.communication_logs FROM public;

-- 2) Ensure authenticated users only have RLS-controlled access
GRANT SELECT ON public.communication_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.communication_logs TO service_role;

-- 3) Revoke default execute permissions on all public functions
-- This prevents "RLS bypass via RPC" attacks
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 4) Create admin_proxy_sessions table for server-side session management
CREATE TABLE IF NOT EXISTS public.admin_proxy_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  is_active boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  ip_address text,
  user_agent text
);

-- 5) Enable RLS on proxy sessions
ALTER TABLE public.admin_proxy_sessions ENABLE ROW LEVEL SECURITY;

-- 6) Only admins can read their own proxy sessions
CREATE POLICY "admins_read_own_proxy_sessions"
ON public.admin_proxy_sessions
FOR SELECT
TO authenticated
USING (
  admin_user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- 7) Service role manages proxy sessions
CREATE POLICY "service_role_manage_proxy_sessions"
ON public.admin_proxy_sessions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8) Revoke public access
REVOKE ALL ON public.admin_proxy_sessions FROM anon;
REVOKE ALL ON public.admin_proxy_sessions FROM public;
GRANT SELECT ON public.admin_proxy_sessions TO authenticated;
GRANT ALL ON public.admin_proxy_sessions TO service_role;

-- 9) Re-grant execute on essential helper functions that authenticated users need
-- These are safe read-only helpers with proper authorization inside
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organization_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_own_profile(uuid, uuid) TO authenticated;
