-- Phase 1.2-1.6: Tier tracking, RLS policies, and helper functions (Fixed)

-- 1.2 Add tier tracking to user_progress
ALTER TABLE public.user_progress 
ADD COLUMN IF NOT EXISTS current_tier TEXT DEFAULT 'green' CHECK (current_tier IN ('green', 'yellow', 'red')),
ADD COLUMN IF NOT EXISTS tier_unlocked_at TIMESTAMP WITH TIME ZONE;

-- 1.3 Create tier_achievements table
CREATE TABLE IF NOT EXISTS public.tier_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('green', 'yellow', 'red')),
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  modules_completed INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tier)
);

ALTER TABLE public.tier_achievements ENABLE ROW LEVEL SECURITY;

-- 1.4 Helper Functions

-- Check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Get user's current tier
CREATE OR REPLACE FUNCTION public.get_user_tier(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN COUNT(*) FILTER (WHERE tier = 'red') > 0 THEN 'red'
      WHEN COUNT(*) FILTER (WHERE tier = 'yellow') > 0 THEN 'yellow'
      ELSE 'green'
    END
  FROM public.tier_achievements
  WHERE user_id = _user_id
$$;

-- Unlock next tier for user
CREATE OR REPLACE FUNCTION public.unlock_tier(_user_id UUID, _tier TEXT, _modules_completed INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert tier achievement
  INSERT INTO public.tier_achievements (user_id, tier, modules_completed)
  VALUES (_user_id, _tier, _modules_completed)
  ON CONFLICT (user_id, tier) DO NOTHING;
  
  -- Update user progress current tier
  UPDATE public.user_progress
  SET current_tier = _tier, tier_unlocked_at = NOW()
  WHERE user_id = _user_id AND course_id = (SELECT id FROM public.courses LIMIT 1);
  
  RETURN TRUE;
END;
$$;

-- 1.5 RLS Policies for Training Coordinators

-- Training coordinators can view employees in their org
DROP POLICY IF EXISTS "Training coordinators view org employees" ON public.profiles;
CREATE POLICY "Training coordinators view org employees"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'training_coordinator'::app_role
      AND p.organization_id = profiles.organization_id
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'dispensary_manager'::app_role
      AND p.organization_id = profiles.organization_id
  )
);

-- Training coordinators can view org progress
DROP POLICY IF EXISTS "Training coordinators view org progress" ON public.user_progress;
CREATE POLICY "Training coordinators view org progress"
ON public.user_progress FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    JOIN public.profiles p2 ON p2.user_id = auth.uid()
    WHERE (ur.role = 'training_coordinator'::app_role OR ur.role = 'dispensary_manager'::app_role)
      AND p1.user_id = user_progress.user_id
      AND p1.organization_id = p2.organization_id
  )
);

-- Tier achievements RLS
CREATE POLICY "Users view own tier achievements"
ON public.tier_achievements FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Coordinators view org tier achievements"
ON public.tier_achievements FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    JOIN public.profiles p2 ON p2.user_id = auth.uid()
    WHERE (ur.role = 'training_coordinator'::app_role OR ur.role = 'dispensary_manager'::app_role)
      AND p1.user_id = tier_achievements.user_id
      AND p1.organization_id = p2.organization_id
  )
);

CREATE POLICY "Service role can manage tier achievements"
ON public.tier_achievements FOR ALL
USING (current_setting('role'::text) = 'service_role'::text);

-- Training coordinators can view org certificates
DROP POLICY IF EXISTS "Training coordinators view org certificates" ON public.certificates;
CREATE POLICY "Training coordinators view org certificates"
ON public.certificates FOR SELECT
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.user_roles ur ON ur.user_id = auth.uid()
    JOIN public.profiles p2 ON p2.user_id = auth.uid()
    WHERE (ur.role = 'training_coordinator'::app_role OR ur.role = 'dispensary_manager'::app_role)
      AND p1.user_id = certificates.user_id
      AND p1.organization_id = p2.organization_id
  )
);

-- 1.6 Drop and recreate get_organization_employees with tier info
DROP FUNCTION IF EXISTS public.get_organization_employees(uuid);

CREATE FUNCTION public.get_organization_employees(org_id uuid)
RETURNS TABLE(
  user_id uuid, 
  first_name text, 
  last_name text, 
  email text, 
  phone text, 
  created_at timestamp with time zone, 
  progress_percentage integer, 
  certificates_count integer, 
  last_activity timestamp with time zone,
  current_tier text,
  tier_unlocked_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.first_name,
    p.last_name,
    au.email,
    p.phone,
    p.created_at,
    COALESCE(
      ROUND(
        (COUNT(CASE WHEN up.is_completed = true THEN 1 END) * 100.0 / 18)::NUMERIC, 0
      )::INTEGER, 0
    ) as progress_percentage,
    COALESCE(COUNT(c.id)::INTEGER, 0) as certificates_count,
    GREATEST(p.updated_at, MAX(up.updated_at)) as last_activity,
    COALESCE(public.get_user_tier(p.user_id), 'green') as current_tier,
    MAX(up.tier_unlocked_at) as tier_unlocked_at
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  LEFT JOIN public.user_progress up ON up.user_id = p.user_id
  LEFT JOIN public.certificates c ON c.user_id = p.user_id AND c.is_revoked = false
  WHERE p.organization_id = org_id
  GROUP BY p.user_id, p.first_name, p.last_name, au.email, p.phone, p.created_at, p.updated_at;
END;
$$;