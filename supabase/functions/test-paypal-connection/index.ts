import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { getActivePayPalEnv, resolvePayPalCreds } from "../_shared/paypal-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("=== PayPal Connection Test Starting ===");
    
    // Step 1: Get active environment from database
    const environment = await getActivePayPalEnv();
    console.log("Active PayPal environment:", environment);

    // Step 2: Resolve credentials for this environment
    const { id: clientId, secret: clientSecret, baseUrl: apiBase } = resolvePayPalCreds(environment);

    console.log("Credentials check:");
    console.log("- Environment:", environment);
    console.log("- API Base:", apiBase);
    console.log("- Client ID length:", clientId.length);
    console.log("- Client Secret present:", !!clientSecret);

    // Step 3: Create authorization header
    const auth = btoa(`${clientId}:${clientSecret}`);
    console.log("Authorization header created (base64 encoded)");

    // Step 4: Attempt to get access token
    console.log("Requesting access token from PayPal...");
    const tokenResponse = await fetch(`${apiBase}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenResponse.json();
    console.log("PayPal Response Status:", tokenResponse.status);
    console.log("PayPal Response:", JSON.stringify(tokenData, null, 2));

    // Step 5: Return detailed results
    if (tokenResponse.ok && tokenData.access_token) {
      return new Response(JSON.stringify({
        success: true,
        message: "✅ PayPal API connection successful!",
        details: {
          environment: environment,
          apiBase: apiBase,
          tokenReceived: true,
          tokenType: tokenData.token_type,
          expiresIn: tokenData.expires_in,
          scope: tokenData.scope,
          clientIdFirst4: clientId.substring(0, 4) + "...",
          clientIdLast4: "..." + clientId.substring(clientId.length - 4)
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "❌ PayPal API authentication failed",
        error: tokenData.error || "Unknown error",
        errorDescription: tokenData.error_description || "No description provided",
        details: {
          environment: environment,
          apiBase: apiBase,
          statusCode: tokenResponse.status,
          clientIdFirst4: clientId.substring(0, 4) + "...",
          clientIdLast4: "..." + clientId.substring(clientId.length - 4),
          possibleIssues: [
            "Credentials may be from different environment (sandbox vs production)",
            "Client ID or Secret may be incorrect",
            "PayPal app may not be activated",
            "API credentials may have been revoked"
          ]
        },
        fullResponse: tokenData
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

  } catch (error) {
    console.error("Test function error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Test function error",
      message: error.message,
      stack: error.stack
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
