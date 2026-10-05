-- A training coordinator or dispensary manager is stored as a role plus
-- profiles.organization_id. The roster and certificate RPCs only allow a
-- caller who has an active organization_members row. Write that row when
-- the role is assigned and the profile is already linked to an organization.
-- organization_members has no email trigger.

CREATE OR REPLACE FUNCTION public.link_roster_membership_for_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_email text;
BEGIN
  IF NEW.role::text NOT IN ('training_coordinator', 'dispensary_manager') THEN
    RETURN NEW;
  END IF;

  SELECT p.organization_id, COALESCE(NULLIF(p.email_cache, ''), au.email)
    INTO v_org, v_email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
  WHERE p.user_id = NEW.user_id;

  IF v_org IS NULL OR v_email IS NULL OR length(trim(v_email)) = 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.role::text = 'training_coordinator' THEN
    INSERT INTO public.organization_members (
      organization_id, user_id, email, role, status, member_type
    ) VALUES (
      v_org, NEW.user_id, v_email, 'training_coordinator', 'active', 'coordinator'
    )
    ON CONFLICT (organization_id, email, role)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      status = 'active',
      member_type = 'coordinator',
      updated_at = now();
  ELSE
    INSERT INTO public.organization_members (
      organization_id, user_id, email, role, status, member_type
    ) VALUES (
      v_org, NEW.user_id, v_email, 'dispensary_admin', 'active', 'manager'
    )
    ON CONFLICT (organization_id, email, role)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      status = 'active',
      member_type = 'manager',
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_roster_membership ON public.user_roles;
CREATE TRIGGER trg_link_roster_membership
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.link_roster_membership_for_role();
