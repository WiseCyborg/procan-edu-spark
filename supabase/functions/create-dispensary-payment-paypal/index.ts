import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PayPal API base URLs
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_ENVIRONMENT") === "production" 
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, credits } = await req.json();
    
    if (!applicationId || !credits) {
      throw new Error("Application ID and credits are required");
    }

    // Initialize Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get application details
    const { data: application, error: appError } = await supabaseService
      .from('dispensary_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('application_status', 'approved')
      .single();

    if (appError || !application) {
      throw new Error("Application not found or not approved");
    }

    // Get PayPal access token
    const paypalAuth = btoa(`${Deno.env.get("PAYPAL_CLIENT_ID")}:${Deno.env.get("PAYPAL_CLIENT_SECRET")}`);
    
    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${paypalAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Calculate amount (credits * $49.99)
    const unitAmount = 49.99;
    const totalAmount = (credits * unitAmount).toFixed(2);

    // Create PayPal order
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: applicationId,
        amount: {
          currency_code: "USD",
          value: totalAmount,
        },
        description: `${credits} ProCann Edu Training Licenses for ${application.organization_name}`,
        custom_id: `dispensary_${applicationId}_credits_${credits}`,
      }],
      application_context: {
        return_url: `${req.headers.get("origin")}/payment-success?application_id=${applicationId}`,
        cancel_url: `${req.headers.get("origin")}/auth?role=dispensary`,
        brand_name: "ProCann Edu",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    };

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order creation error:", orderData);
      throw new Error(`PayPal order creation failed: ${orderData.message || "Unknown error"}`);
    }

    // Create order record
    const { error: orderError } = await supabaseService
      .from("orders")
      .insert({
        paypal_order_id: orderData.id,
        amount: Math.round(parseFloat(totalAmount) * 100), // Store in cents
        currency: "usd",
        status: "pending",
        metadata: {
          application_id: applicationId,
          organization_name: application.organization_name,
          credits: credits,
          type: "dispensary_bulk_training",
          payment_method: "paypal"
        }
      });

    if (orderError) {
      console.error("Error creating order:", orderError);
    }

    // Find the approval URL from PayPal response
    const approvalUrl = orderData.links?.find((link: any) => link.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    return new Response(JSON.stringify({ 
      url: approvalUrl,
      orderId: orderData.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-dispensary-payment-paypal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});