-- Fix 1: Convert join_codes_seat_health view to security_invoker to respect RLS
ALTER VIEW public.join_codes_seat_health SET (security_invoker = true);

-- Fix 2: Remove the unrestricted public SELECT policy on mock-certificate-photos bucket.
-- The owner-scoped "Users access own certificate files" policy remains.
DROP POLICY IF EXISTS "Mock photos are publicly accessible" ON storage.objects;