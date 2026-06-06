
ALTER TABLE public.payment_events
  ADD COLUMN IF NOT EXISTS paypal_event_id text,
  ADD COLUMN IF NOT EXISTS paypal_order_id text,
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.dispensary_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.rvt_purchases(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount numeric,
  ADD COLUMN IF NOT EXISTS currency text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payment_events_paypal_event_id_key'
  ) THEN
    ALTER TABLE public.payment_events
      ADD CONSTRAINT payment_events_paypal_event_id_key UNIQUE (paypal_event_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payment_events_application_id ON public.payment_events(application_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events(created_at DESC);
