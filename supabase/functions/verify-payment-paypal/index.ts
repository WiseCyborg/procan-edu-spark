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
    const { orderId } = await req.json();
    
    if (!orderId) {
      throw new Error("PayPal order ID is required");
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

    // Get order details from PayPal
    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order verification error:", orderData);
      throw new Error(`PayPal order verification failed: ${orderData.message || "Unknown error"}`);
    }

    // Initialize Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if order is completed/approved
    if (orderData.status === "COMPLETED" || orderData.status === "APPROVED") {
      // Update order status in database
      const { error: updateError } = await supabaseService
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString(),
          paypal_payer_id: orderData.payer?.payer_id,
          paypal_payment_id: orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id
        })
        .eq("paypal_order_id", orderId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw new Error("Failed to update order status");
      }

      // Extract course ID or application ID from custom_id or reference_id
      const customId = orderData.purchase_units?.[0]?.custom_id || "";
      const referenceId = orderData.purchase_units?.[0]?.reference_id;
      
      let responseData = { paid: true };

      if (customId.includes("course_")) {
        // Course payment
        const courseId = customId.split("course_")[1]?.split("_user_")[0] || referenceId;
        responseData = { ...responseData, courseId };
      } else if (customId.includes("dispensary_")) {
        // Dispensary payment - extract application ID
        const applicationId = customId.split("dispensary_")[1]?.split("_credits_")[0] || referenceId;
        responseData = { ...responseData, applicationId };
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Payment not completed
      return new Response(JSON.stringify({ paid: false, status: orderData.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error in verify-payment-paypal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});