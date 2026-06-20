ALTER TABLE public.payment_events
  DROP CONSTRAINT IF EXISTS payment_events_status_check;

ALTER TABLE public.payment_events
  ADD CONSTRAINT payment_events_status_check
  CHECK (status = ANY (ARRAY[
    'received'::text,
    'processing'::text,
    'processed'::text,
    'completed'::text,
    'failed'::text,
    'unrecognized'::text,
    'unhandled'::text,
    'invalid_signature'::text,
    'signature_check_error'::text,
    'missing_webhook_id'::text,
    'payment.capture.denied'::text,
    'payment.capture.refunded'::text
  ]));