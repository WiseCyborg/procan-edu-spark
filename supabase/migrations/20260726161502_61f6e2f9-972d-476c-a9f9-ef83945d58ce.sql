CREATE OR REPLACE FUNCTION public.get_org_profile_completion(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  filled int := 0;
  total int := 6;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  SELECT * INTO p FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF NOT (
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
  ) THEN
    RETURN 0;
  END IF;

  IF coalesce(p.first_name, '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(p.last_name, '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(p.phone, '') <> '' THEN filled := filled + 1; END IF;
  IF p.date_of_birth IS NOT NULL THEN filled := filled + 1; END IF;
  IF coalesce(p.emergency_contact_name, '') <> '' THEN filled := filled + 1; END IF;
  IF coalesce(p.emergency_contact_phone, '') <> '' THEN filled := filled + 1; END IF;

  RETURN round((filled::numeric / total) * 100);
END;
$$;

REVOKE ALL ON FUNCTION public.get_org_profile_completion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_profile_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_org_profile_completion(uuid) TO service_role;