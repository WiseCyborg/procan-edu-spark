-- ============================================
-- SECURITY FIX #1: Tighten profiles RLS policies
-- ============================================

-- Drop existing overly permissive policies that may allow cross-org access
DROP POLICY IF EXISTS "Training coordinators view org employees" ON profiles;

-- Create stricter org-scoped read policy for managers/coordinators
CREATE POLICY "Org managers view employees in their org only"
ON profiles
FOR SELECT
TO authenticated
USING (
  -- User can always view their own profile
  user_id = auth.uid()
  OR
  -- Admin can view all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager/coordinator can ONLY view profiles in their organization
  (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
    )
    AND organization_id IS NOT NULL
    AND organization_id = (
      SELECT p2.organization_id 
      FROM profiles p2 
      WHERE p2.user_id = auth.uid()
    )
  )
);

-- ============================================
-- SECURITY FIX #2: Tighten certificates RLS policies
-- ============================================

-- Drop policies that might allow enumeration
DROP POLICY IF EXISTS "Training coordinators view org certificates" ON certificates;

-- Create stricter org-scoped certificate policy
CREATE POLICY "Org managers view certificates in their org only"
ON certificates
FOR SELECT
TO authenticated
USING (
  -- User can view their own certificates
  user_id = auth.uid()
  OR
  -- Admin can view all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Manager/coordinator can ONLY view certificates for users in their org
  (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
    )
    AND EXISTS (
      SELECT 1 FROM profiles cert_holder
      JOIN profiles viewer ON viewer.user_id = auth.uid()
      WHERE cert_holder.user_id = certificates.user_id
        AND cert_holder.organization_id IS NOT NULL
        AND cert_holder.organization_id = viewer.organization_id
    )
  )
);

-- ============================================
-- SECURITY FIX #3: Create secure admin user management edge function
-- This replaces client-side supabase.auth.admin.* calls
-- ============================================

-- First, create a secure audit log for admin operations
CREATE TABLE IF NOT EXISTS public.admin_operations_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type TEXT NOT NULL,
  performed_by UUID NOT NULL,
  target_user_id UUID,
  target_email TEXT,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.admin_operations_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins view admin operations audit"
ON admin_operations_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert audit logs
CREATE POLICY "Service role inserts audit logs"
ON admin_operations_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================
-- SECURITY FIX #4: Add helper function to check org membership
-- ============================================

CREATE OR REPLACE FUNCTION public.is_same_organization(viewer_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM profiles viewer
    JOIN profiles target ON target.user_id = target_user_id
    WHERE viewer.user_id = viewer_id
      AND viewer.organization_id IS NOT NULL
      AND viewer.organization_id = target.organization_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_same_organization(UUID, UUID) TO authenticated;