import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DISABLED 2026-08-07 (security lockdown).
// This legacy allocator accepted the mere PRESENCE of an Authorization or
// PAYPAL-TRANSMISSION-ID header as authorization, with NO PayPal signature
// verification and NO payment lookup. That allowed anyone to mint 'paid'
// rvt_purchases, rvt_seats, and a working join code with zero payment.
// Seat provisioning is handled exclusively by paypal-webhook (signature-verified).
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  console.warn('allocate-seats-on-payment invoked but is DISABLED (security lockdown 2026-08-07)');
  return new Response(
    JSON.stringify({ error: 'This endpoint has been disabled.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
