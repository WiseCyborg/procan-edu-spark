DO $$
DECLARE
  v_conname text;
BEGIN
  -- Add the column the accept-invitation function (and other code) expects.
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_organization_id uuid;

  -- Expand the entitlement source constraint to accept 'seat_allocation'.
  SELECT c.conname INTO v_conname
  FROM pg_constraint c
  JOIN pg_class t ON t.oid=c.conrelid
  JOIN pg_namespace n ON n.oid=t.relnamespace
  WHERE n.nspname='public' AND t.relname='course_entitlements' AND c.contype='c'
    AND pg_get_constraintdef(c.oid) ILIKE '%source%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.course_entitlements DROP CONSTRAINT %I', v_conname);
  END IF;

  ALTER TABLE public.course_entitlements
    ADD CONSTRAINT course_entitlements_source_check
    CHECK (source = ANY (ARRAY['stripe','paypal','org_seat','admin_grant','promo_code','auto_remediation','seat_allocation']));
END $$;