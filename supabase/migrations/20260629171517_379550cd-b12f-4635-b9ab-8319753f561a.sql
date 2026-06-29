ALTER TABLE public.org_invites
  ADD CONSTRAINT org_invites_no_plaintext_token CHECK (token IS NULL);