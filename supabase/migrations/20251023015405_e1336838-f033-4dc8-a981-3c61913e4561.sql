-- ============================================
-- PHASE 1: FIX RLS INFINITE RECURSION
-- ============================================
-- Problem: Policy on profiles table was querying profiles table (JOIN profiles)
-- Solution: Use SECURITY DEFINER function to bypass RLS when checking org membership

-- Step 1: Create helper function to check if viewer can see target profile
CREATE OR REPLACE FUNCTION public.user_can_view_profile(_viewer_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  viewer_org_id uuid;
  target_org_id uuid;
BEGIN
  -- User can always see own profile
  IF _viewer_id = _target_user_id THEN
    RETURN true;
  END IF;
  
  -- Admins can see all profiles
  IF public.has_role(_viewer_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Check if viewer is a training coordinator or dispensary manager
  IF public.has_role(_viewer_id, 'training_coordinator'::app_role) 
     OR public.has_role(_viewer_id, 'dispensary_manager'::app_role) THEN
    
    -- Get organization IDs WITHOUT triggering RLS (runs with definer privileges)
    SELECT organization_id INTO viewer_org_id 
    FROM public.profiles 
    WHERE user_id = _viewer_id
    LIMIT 1;
    
    SELECT organization_id INTO target_org_id 
    FROM public.profiles 
    WHERE user_id = _target_user_id
    LIMIT 1;
    
    -- If both in same org, allow access
    IF viewer_org_id IS NOT NULL AND viewer_org_id = target_org_id THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Default: no access
  RETURN false;
END;
$$;

-- Step 2: Grant permissions
GRANT EXECUTE ON FUNCTION public.user_can_view_profile TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_profile TO service_role;

-- Step 3: Drop the broken policy
DROP POLICY IF EXISTS "Training coordinators view org employees" ON public.profiles;

-- Step 4: Create new non-recursive policy using the helper function
CREATE POLICY "Training coordinators view org employees" 
ON public.profiles
FOR SELECT
USING (public.user_can_view_profile(auth.uid(), user_id));

-- Step 5: Verify the fix with a comment
COMMENT ON FUNCTION public.user_can_view_profile IS 
'Security definer function to check profile visibility without RLS recursion. Used by profiles table RLS policy.';