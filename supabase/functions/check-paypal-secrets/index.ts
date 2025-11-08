import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secrets = {
      sandboxClientId: !!Deno.env.get("PAYPAL_SANDBOX_CLIENT_ID"),
      sandboxClientSecret: !!Deno.env.get("PAYPAL_SANDBOX_CLIENT_SECRET"),
      productionClientId: !!Deno.env.get("PAYPAL_PRODUCTION_CLIENT_ID"),
      productionClientSecret: !!Deno.env.get("PAYPAL_PRODUCTION_CLIENT_SECRET"),
      legacyClientId: !!Deno.env.get("PAYPAL_CLIENT_ID"),
      legacyClientSecret: !!Deno.env.get("PAYPAL_CLIENT_SECRET"),
    };

    const sandboxReady = secrets.sandboxClientId && secrets.sandboxClientSecret;
    const productionReady = secrets.productionClientId && secrets.productionClientSecret;
    const hasLegacy = secrets.legacyClientId && secrets.legacyClientSecret;

    return new Response(
      JSON.stringify({
        secrets,
        sandboxReady,
        productionReady,
        hasLegacy,
        recommendations: {
          canUseSandbox: sandboxReady || hasLegacy,
          canUseProduction: productionReady || hasLegacy,
          shouldMigrate: hasLegacy && !(sandboxReady && productionReady),
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking PayPal secrets:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
