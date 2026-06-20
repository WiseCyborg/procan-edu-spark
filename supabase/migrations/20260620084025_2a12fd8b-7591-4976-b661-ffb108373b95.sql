ALTER TABLE public.course_entitlements
  DROP CONSTRAINT IF EXISTS course_entitlements_source_check;

ALTER TABLE public.course_entitlements
  ADD CONSTRAINT course_entitlements_source_check
  CHECK (source = ANY (ARRAY['stripe'::text, 'paypal'::text, 'org_seat'::text, 'admin_grant'::text, 'promo_code'::text]));