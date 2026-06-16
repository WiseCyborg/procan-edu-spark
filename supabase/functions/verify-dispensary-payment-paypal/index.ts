// verify-dispensary-payment-paypal
//
// P4 (2026-06-16): demoted to READ-ONLY status reporting.
//
// The PayPal webhook (`paypal-webhook`) is now the single writer for
// `rvt_purchases`, `rvt_seats`, `rvt_join_codes`, application status,
// and confirmation/team-ready emails. This endpoint used to mirror that
// provisioning from the browser, which created a race against the webhook
// and could yield duplicate purchases or skipped seats.
//
// This endpoint now ONLY:
//   1. Captures the PayPal order with PayPal (idempotent on PayPal's side),
//      so the order doesn't sit in APPROVED forever if the buyer closes the
//      tab before the webhook fires.
//   2. Reports back what we currently see in our DB for that order:
//        - { paid: true, status: "provisioned", ... } if the webhook has
//          already written the purchase + seats
//        - { paid: true, status: "pending_webhook", ... } if PayPal says
//          the payment is captured but our webhook hasn't landed yet
//        - { paid: false, status: "<paypal_status>" } otherwise
//
// `PaymentSuccess.tsx` treats `pending_webhook` as "keep polling".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPayPalEnvForOrg, resolvePayPalCreds } from "../_shared/paypal-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return json({ success: false, error_code: "MISSING_ORDER_ID", error: "Order ID is required" }, 400);
    }

    await supabaseService.from("payment_audit_log").insert({
      order_id: orderId,
      event_type: "VERIFICATION_STARTED_READONLY",
      event_data: { timestamp: new Date().toISOString() },
    });

    // 1. Look up the purchase row by paypal_order_id. The webhook stamps this
    //    field when it provisions seats; if we see it, we know provisioning
    //    is already done and we can answer from the DB without calling PayPal.
    const { data: existingPurchase } = await supabaseService
      .from("rvt_purchases")
      .select("id, organization_id, quantity, status, paypal_order_id, completed_at")
      .eq("paypal_order_id", orderId)
      .maybeSingle();

    if (existingPurchase && existingPurchase.status === "paid") {
      const { count: seatCount } = await supabaseService
        .from("rvt_seats")
        .select("id", { count: "exact", head: true })
        .eq("purchase_id", existingPurchase.id);

      await supabaseService.from("payment_audit_log").insert({
        order_id: orderId,
        event_type: "VERIFICATION_REPORT_PROVISIONED",
        event_data: { purchase_id: existingPurchase.id, seats: seatCount ?? 0 },
      });

      return json({
        success: true,
        paid: true,
        status: "provisioned",
        purchaseId: existingPurchase.id,
        organizationId: existingPurchase.organization_id,
        quantity: existingPurchase.quantity,
        seats_provisioned: true,
        seats_count: seatCount ?? 0,
      });
    }

    // 2. Determine env (best-effort — fall back to env var) and capture the
    //    PayPal order so it doesn't get stuck in APPROVED. PayPal capture is
    //    itself idempotent for an already-captured order.
    let paypalEnv: "sandbox" | "production" =
      (Deno.env.get("PAYPAL_ENVIRONMENT") as "sandbox" | "production") || "sandbox";

    // If we have a purchase row we know the org and can pick its env precisely.
    if (existingPurchase?.organization_id) {
      paypalEnv = (await getPayPalEnvForOrg(existingPurchase.organization_id)) as
        | "sandbox"
        | "production";
    }
    const creds = resolvePayPalCreds(paypalEnv);
    const auth = btoa(`${creds.id}:${creds.secret}`);

    const tokenRes = await fetch(`${creds.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Fetch order
    const orderRes = await fetch(`${creds.baseUrl}/v2/checkout/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });
    const orderData = await orderRes.json();

    await supabaseService.from("payment_audit_log").insert({
      order_id: orderId,
      event_type: "PAYPAL_ORDER_FETCHED",
      event_data: { status: orderData.status },
    });

    // If APPROVED but not yet captured, capture now so the webhook fires.
    // PayPal returns 422 with ORDER_ALREADY_CAPTURED on re-capture — safe to ignore.
    if (orderData.status === "APPROVED") {
      const capRes = await fetch(`${creds.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const capData = await capRes.json().catch(() => ({}));
      await supabaseService.from("payment_audit_log").insert({
        order_id: orderId,
        event_type: "PAYPAL_CAPTURE_TRIGGERED",
        event_data: { status: capRes.status, response_status: capData?.status },
      });
    }

    const paid =
      orderData.status === "COMPLETED" ||
      orderData.status === "APPROVED";

    if (!paid) {
      return json({
        success: true,
        paid: false,
        status: orderData.status,
        message: `Payment status: ${orderData.status}`,
      });
    }

    // 3. PayPal says paid, but the webhook hasn't provisioned yet.
    //    Client should keep polling.
    await supabaseService.from("payment_audit_log").insert({
      order_id: orderId,
      event_type: "VERIFICATION_REPORT_PENDING_WEBHOOK",
      event_data: { paypal_status: orderData.status },
    });

    return json({
      success: true,
      paid: true,
      status: "pending_webhook",
      seats_provisioned: false,
      message:
        "Payment captured. Waiting for PayPal to notify our servers — your seats will appear shortly.",
    });
  } catch (error) {
    console.error("Error in verify-dispensary-payment-paypal:", error);
    // 200 OK + actionable error (per project convention)
    return json({
      success: false,
      paid: false,
      error_code: "VERIFICATION_FAILED",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
