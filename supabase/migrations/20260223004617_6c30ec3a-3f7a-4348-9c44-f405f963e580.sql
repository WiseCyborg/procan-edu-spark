
-- 1) Add unique constraint on course_completions for upsert support
ALTER TABLE public.course_completions 
ADD CONSTRAINT course_completions_user_course_unique UNIQUE (user_id, course_id);

-- 2) Auto-create org membership on organization creation
CREATE OR REPLACE FUNCTION public.auto_create_org_membership()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM organization_members 
    WHERE organization_id = NEW.id AND user_id = auth.uid()
  ) THEN
    INSERT INTO organization_members (
      organization_id, user_id, email, role, status, member_type
    )
    SELECT 
      NEW.id, auth.uid(), 
      COALESCE(p.email_cache, u.email, 'unknown'),
      'manager', 'active', 'manager'
    FROM auth.users u
    LEFT JOIN profiles p ON p.user_id = u.id
    WHERE u.id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_org_membership ON public.organizations;
CREATE TRIGGER trg_auto_org_membership
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_org_membership();
