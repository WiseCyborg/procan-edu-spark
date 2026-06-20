-- 1. payment_events: stripe_event_id was NOT NULL, blocking every PayPal event insert silently.
ALTER TABLE public.payment_events ALTER COLUMN stripe_event_id DROP NOT NULL;

ALTER TABLE public.payment_events
  DROP CONSTRAINT IF EXISTS payment_events_provider_event_id_present;

ALTER TABLE public.payment_events
  ADD CONSTRAINT payment_events_provider_event_id_present
  CHECK (stripe_event_id IS NOT NULL OR paypal_event_id IS NOT NULL);

-- 2. orders.paid_at — referenced by paypal-webhook but never created. Add it.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;