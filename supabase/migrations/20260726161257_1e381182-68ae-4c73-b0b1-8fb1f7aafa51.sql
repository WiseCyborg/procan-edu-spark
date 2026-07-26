-- Replace definer view with a security definer function (no view-based RLS bypass)
DROP VIEW IF EXISTS public.org_employee_directory;

CREATE OR REPLACE FUNCTION public.get_org_employee_directory(_organization_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  email_cache text,
  organization text,
  organization_id uuid,
  job_title text,
  job_role job_role,
  tier_status text,
  is_verified boolean,
  phone_verified boolean,
  profile_photo_url text,
  welcome_video_watched boolean,
  first_shift_date date,
  training_verified_at timestamptz,
  preferred_language text,
  deleted_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.user_id, p.first_name, p.last_name, p.email_cache, p.organization,
    p.organization_id, p.job_title, p.job_role, p.tier_status, p.is_verified,
    p.phone_verified, p.profile_photo_url, p.welcome_video_watched, p.first_shift_date,
    p.training_verified_at, p.preferred_language, p.deleted_at, p.deactivated_at,
    p.created_at, p.updated_at
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (_organization_id IS NULL OR p.organization_id = _organization_id)
    AND (
      p.user_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::app_role)
      OR (
        p.organization_id IS NOT NULL
        AND p.organization_id = public.get_user_organization_id(auth.uid())
        AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid()
            AND ur.role = ANY (ARRAY['dispensary_manager'::app_role, 'training_coordinator'::app_role])
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION public.get_org_employee_directory(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_employee_directory(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_employee_directory(uuid) TO service_role;

-- Email confirmation helper (no reliance on editable user_metadata)
CREATE OR REPLACE FUNCTION public.is_caller_email_confirmed()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_caller_email_confirmed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_caller_email_confirmed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_caller_email_confirmed() TO service_role;

DROP POLICY IF EXISTS "Users view own memberships" ON public.organization_members;
CREATE POLICY "Users view own memberships"
ON public.organization_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR (
    status = 'invited'
    AND email = auth.email()
    AND public.is_caller_email_confirmed()
  )
);