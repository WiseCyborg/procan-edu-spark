// DEPRECATED — Stripe-based dispensary payment flow.
// Retired in favor of `create-dispensary-payment-paypal`. Kept as a 410
// stub so any stale caller fails loudly instead of silently.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(
    JSON.stringify({
      error: "deprecated",
      message: "Stripe payments are retired. Use the PayPal flow.",
    }),
    {
      status: 410,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
