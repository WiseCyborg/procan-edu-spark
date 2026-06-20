import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getActivePayPalEnv, resolvePayPalCreds } from "../_shared/paypal-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      throw new Error("PayPal order ID is required");
    }

    // Get PayPal environment and credentials
    const paypalEnv = await getActivePayPalEnv();
    const { id: PAYPAL_CLIENT_ID, secret: PAYPAL_CLIENT_SECRET, baseUrl: PAYPAL_API_BASE } = 
      resolvePayPalCreds(paypalEnv);

    console.log(`Using PayPal ${paypalEnv} mode for payment verification`);

    // Get PayPal access token
    const paypalAuth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);
    
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
      const captureId = orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id;

      // Update order status in database
      const { error: updateError } = await supabaseService
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString(),
          paypal_payer_id: orderData.payer?.payer_id,
          paypal_payment_id: captureId
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

        // Fetch order and user details for payment confirmation email
        const { data: order } = await supabaseService
          .from("orders")
          .select(`
            user_id,
            course_id,
            amount,
            currency,
            id
          `)
          .eq("paypal_order_id", orderId)
          .single();

        if (order) {
          // ============================================================
          // Gate 4 fix (2026-06-20) — grant course access server-side.
          // Idempotent: UNIQUE(user_id, course_id) on course_entitlements
          // means a duplicate call (or the paypal-webhook firing too) is a
          // no-op upsert. PaymentSuccess.tsx redirects to /courses/{id}
          // immediately after this returns; without this insert
          // usePaymentStatus would still see no entitlement and
          // CoursePaymentGate would re-render the paywall.
          // ============================================================
          const { error: entErr } = await supabaseService
            .from("course_entitlements")
            .upsert({
              user_id: order.user_id,
              course_id: order.course_id,
              source: "paypal",
              status: "active",
              purchased_at: new Date().toISOString(),
              metadata: {
                paypal_order_id: orderId,
                paypal_capture_id: captureId ?? null,
                order_id: order.id,
                amount_cents: order.amount,
                currency: (order.currency || "usd").toLowerCase(),
                granted_via: "verify-payment-paypal",
              },
            }, { onConflict: "user_id,course_id" });

          if (entErr) {
            console.error("[verify-payment-paypal] entitlement upsert failed", entErr);
            // Hard-fail so the frontend knows access was NOT granted, even
            // though PayPal captured. Manual remediation is preferable to a
            // silent paywall.
            throw new Error(`Entitlement upsert failed: ${entErr.message}`);
          }

          const { data: { user } } = await supabaseService.auth.admin.getUserById(order.user_id);
          const { data: profile } = await supabaseService
            .from("profiles")
            .select("first_name, last_name")
            .eq("user_id", order.user_id)
            .single();

          const { data: course } = await supabaseService
            .from("courses")
            .select("title")
            .eq("id", order.course_id)
            .single();

          // Trigger payment confirmation email (fire-and-forget)
          supabaseService.functions.invoke('send-payment-confirmation', {
            body: {
              orderId: order.id,
              courseId: order.course_id,
              courseTitle: course?.title || 'Maryland Responsible Vendor Training',
              amount: (order.amount / 100).toFixed(2),
              currency: order.currency.toUpperCase(),
              userEmail: user?.email,
              userName: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Student'
            }
          }).catch(err => console.error('Payment confirmation email failed:', err));
        }
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