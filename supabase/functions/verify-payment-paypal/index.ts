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

    const paypalEnv = await getActivePayPalEnv();
    const { id: PAYPAL_CLIENT_ID, secret: PAYPAL_CLIENT_SECRET, baseUrl: PAYPAL_API_BASE } =
      resolvePayPalCreds(paypalEnv);

    console.log(`Using PayPal ${paypalEnv} mode for payment verification`);

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

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // SECURITY FIX (2026-08-07): grant access ONLY on a COMPLETED capture.
    // Previously granted on status === "APPROVED" (approved but NOT captured => free access).
    // For CAPTURE-intent orders, APPROVED requires an explicit capture. Capture here
    // (idempotent) and require a COMPLETED capture before marking paid or granting.
    let capture = orderData.purchase_units?.[0]?.payments?.captures?.[0];

    if (orderData.status === "APPROVED" && !(capture && capture.status === "COMPLETED")) {
      const capRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const capData = await capRes.json();
      if (capRes.ok) {
        capture = capData.purchase_units?.[0]?.payments?.captures?.[0] || capture;
      } else if (capData?.details?.[0]?.issue === "ORDER_ALREADY_CAPTURED") {
        const reRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        });
        const reData = await reRes.json();
        capture = reData.purchase_units?.[0]?.payments?.captures?.[0] || capture;
      } else {
        console.error("[verify-payment-paypal] capture attempt failed:", capData);
      }
    }

    const isCaptured = !!(capture && capture.status === "COMPLETED");

    if (!isCaptured) {
      // Money not captured -> do NOT mark paid, do NOT grant access.
      return new Response(
        JSON.stringify({ paid: false, status: orderData.status, reason: "not_captured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    const captureId = capture.id;

    const { error: updateError } = await supabaseService
      .from("orders")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
        paypal_payer_id: orderData.payer?.payer_id,
        paypal_payment_id: captureId,
      })
      .eq("paypal_order_id", orderId);

    if (updateError) {
      console.error("Error updating order:", updateError);
      throw new Error("Failed to update order status");
    }

    const customId = orderData.purchase_units?.[0]?.custom_id || "";
    const referenceId = orderData.purchase_units?.[0]?.reference_id;

    let responseData = { paid: true };

    if (customId.includes("course_")) {
      const courseId = customId.split("course_")[1]?.split("_user_")[0] || referenceId;
      responseData = { ...responseData, courseId };

      const { data: order } = await supabaseService
        .from("orders")
        .select(`user_id, course_id, amount, currency, id`)
        .eq("paypal_order_id", orderId)
        .single();

      if (order) {
        // SECURITY FIX (2026-08-07): validate captured amount/currency vs the order before granting.
        const capturedCents = Math.round(parseFloat(capture.amount?.value ?? "0") * 100);
        const capturedCurrency = (capture.amount?.currency_code || "USD").toUpperCase();
        const expectedCents = Number(order.amount);
        const expectedCurrency = (order.currency || "usd").toUpperCase();

        if (capturedCents !== expectedCents || capturedCurrency !== expectedCurrency) {
          console.error("[verify-payment-paypal] captured amount mismatch", {
            capturedCents, expectedCents, capturedCurrency, expectedCurrency, orderId,
          });
          throw new Error("Captured amount does not match order amount");
        }

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
      const applicationId = customId.split("dispensary_")[1]?.split("_credits_")[0] || referenceId;
      responseData = { ...responseData, applicationId };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in verify-payment-paypal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
