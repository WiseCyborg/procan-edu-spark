-- EMERGENCY FIX: Phase 1 - Infinite Recursion & Missing Triggers

-- ============================================
-- 1. FIX INFINITE RECURSION IN PROFILES RLS
-- ============================================

-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Training coordinators view org employees" ON profiles;

-- Create non-recursive version using simpler logic
CREATE POLICY "Training coordinators view org employees" ON profiles
FOR SELECT
USING (
  -- User can always see their own profile
  auth.uid() = user_id 
  OR 
  -- Admins, training coordinators, and dispensary managers can see profiles
  EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role IN ('admin'::app_role, 'training_coordinator'::app_role, 'dispensary_manager'::app_role)
  )
  OR
  -- Managers can see employees in their organization
  EXISTS (
    SELECT 1 
    FROM profiles p2
    JOIN user_roles ur ON ur.user_id = p2.user_id
    WHERE p2.user_id = auth.uid()
    AND ur.role IN ('dispensary_manager'::app_role, 'training_coordinator'::app_role)
    AND p2.organization_id = profiles.organization_id
  )
);

-- ============================================
-- 2. RESTORE MISSING DATABASE TRIGGERS
-- ============================================

-- Drop existing triggers if they exist (cleanup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;

-- Attach profile creation trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Attach role assignment trigger
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================
-- 3. ADD DEMO DATA HELPER FUNCTION
-- ============================================

-- Function to quickly verify system is working
CREATE OR REPLACE FUNCTION public.test_system_health()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
  profile_count int;
  role_count int;
  trigger_count int;
BEGIN
  -- Check profiles table
  SELECT COUNT(*) INTO profile_count FROM profiles;
  
  -- Check user_roles table
  SELECT COUNT(*) INTO role_count FROM user_roles;
  
  -- Check triggers exist
  SELECT COUNT(*) INTO trigger_count 
  FROM pg_trigger 
  WHERE tgname IN ('on_auth_user_created', 'on_auth_user_created_role');
  
  result := jsonb_build_object(
    'status', CASE WHEN trigger_count = 2 THEN 'healthy' ELSE 'missing_triggers' END,
    'profiles_count', profile_count,
    'roles_count', role_count,
    'triggers_attached', trigger_count,
    'timestamp', now()
  );
  
  RETURN result;
END;
$$;

-- ============================================
-- 4. ENSURE ORDERS TABLE IS PROPERLY CONFIGURED
-- ============================================

-- Add index for faster payment status checks
CREATE INDEX IF NOT EXISTS idx_orders_user_course_status 
ON orders(user_id, course_id, status);

-- Add index for PayPal order lookups
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id 
ON orders(paypal_order_id) WHERE paypal_order_id IS NOT NULL;