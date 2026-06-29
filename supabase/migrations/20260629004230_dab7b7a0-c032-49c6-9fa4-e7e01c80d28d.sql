
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.staff_invitations ALTER COLUMN invitation_token DROP NOT NULL;
ALTER TABLE public.org_invites ALTER COLUMN token DROP NOT NULL;

-- org_invites: add hash column + trigger
ALTER TABLE public.org_invites ADD COLUMN IF NOT EXISTS token_hash text;

CREATE OR REPLACE FUNCTION public.hash_org_invite_token()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.token IS NOT NULL AND length(NEW.token) > 0 THEN
    NEW.token_hash := encode(digest(NEW.token, 'sha256'), 'hex');
    NEW.token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_org_invite_token ON public.org_invites;
CREATE TRIGGER trg_hash_org_invite_token
  BEFORE INSERT OR UPDATE ON public.org_invites
  FOR EACH ROW EXECUTE FUNCTION public.hash_org_invite_token();

UPDATE public.org_invites
SET token_hash = encode(digest(token, 'sha256'), 'hex'),
    token = NULL
WHERE token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_org_invites_token_hash ON public.org_invites (token_hash);

-- staff_invitations: trigger to hash and null plaintext
CREATE OR REPLACE FUNCTION public.hash_staff_invitation_token()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invitation_token IS NOT NULL AND length(NEW.invitation_token) > 0 THEN
    IF NEW.invitation_token_hash IS NULL THEN
      NEW.invitation_token_hash := encode(digest(NEW.invitation_token, 'sha256'), 'hex');
    END IF;
    NEW.invitation_token := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_staff_invitation_token ON public.staff_invitations;
CREATE TRIGGER trg_hash_staff_invitation_token
  BEFORE INSERT OR UPDATE ON public.staff_invitations
  FOR EACH ROW EXECUTE FUNCTION public.hash_staff_invitation_token();

UPDATE public.staff_invitations
SET invitation_token_hash = COALESCE(invitation_token_hash, encode(digest(invitation_token, 'sha256'), 'hex')),
    invitation_token = NULL
WHERE invitation_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token_hash ON public.staff_invitations (invitation_token_hash);

-- Fix training-videos storage policy: rvt_seats uses 'assigned'/'used', not 'active'
DROP POLICY IF EXISTS "Entitled users can read training-videos" ON storage.objects;

CREATE POLICY "Entitled users can read training-videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'training-videos'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.video_assets va
      WHERE va.bucket_id = 'training-videos'
        AND va.storage_path = storage.objects.name
        AND (
          va.access_level = 'public'
          OR EXISTS (
            SELECT 1 FROM public.course_entitlements ce
            WHERE ce.user_id = auth.uid()
              AND ce.course_id = va.course_id
              AND ce.status = 'active'
              AND (ce.expires_at IS NULL OR ce.expires_at > now())
          )
          OR EXISTS (
            SELECT 1 FROM public.rvt_seats rs
            WHERE rs.assigned_user_id = auth.uid()
              AND rs.course_id = va.course_id
              AND rs.status = ANY (ARRAY['assigned','used'])
          )
        )
    )
  )
);
