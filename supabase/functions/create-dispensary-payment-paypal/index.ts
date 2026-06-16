// Issue 1001 — REBUILT: public endpoint that takes { application_id } only.
// - No JWT/role check (applicants have no auth user yet at this stage)
// - Derives quantity, amount, org, contact server-side from dispensary_applications
// - Stores application_id in rvt_purchases.metadata for the webhook to find
// - Uses colon-delimited custom_id: "{purchaseId}:{organizationId}:{quantity}"
//   (matches what paypal-webhook and verify-dispensary-payment-paypal parse)
// - Idempotent on application_id: returns the existing pending order if one is open
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPayPalEnvForOrg, resolvePayPalCreds } from "../_shared/paypal-config.ts";
import { DOMAINS } from "../_shared/domains.ts";
import { PRICE_PER_SEAT, PAYMENT_CURRENCY, deriveQuantity } from "../_shared/payment-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.json().catch(() => ({}));
    const application_id: string | undefined = body.application_id;
    const topup_organization_id: string | undefined = body.organization_id;
    const topup_quantity: number | undefined = body.quantity;
    const client_idem_key: string | undefined = body.idempotencyKey ?? body.idempotency_key;

    // ===== Mode resolution =====
    // Mode A (original): application_id only — applicant has no auth yet.
    // Mode B (P1 fix): organization_id + quantity — authenticated manager/coordinator top-up.
    const isTopUp = !application_id && !!topup_organization_id && !!topup_quantity;

    if (!application_id && !isTopUp) {
      return json({
        success: false,
        error_code: "MISSING_APPLICATION_ID",
        error: "application_id is required, or pass { organization_id, quantity } for an authenticated top-up",
      });
    }

    let organization_id: string;
    let quantity: number;
    let totalAmount: string;
    let idempotencyKey: string;
    let contactEmail: string | null = null;
    let orgName: string | null = null;
    let applicationIdForMetadata: string | null = application_id ?? null;

    if (isTopUp) {
      // ===== Mode B: authenticated top-up =====
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return json({ success: false, error_code: "UNAUTHORIZED", error: "Authentication required for top-up" }, 401);
      }
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );
      if (claimsErr || !claimsData?.claims?.sub) {
        return json({ success: false, error_code: "UNAUTHORIZED", error: "Invalid auth token" }, 401);
      }
      const userId = claimsData.claims.sub as string;

      // Validate the caller belongs to the org they're topping up AND has manager/coordinator role
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id, email, organizations(name, admin_approved, is_active)")
        .eq("user_id", userId)
        .maybeSingle();
      if (!profile || profile.organization_id !== topup_organization_id) {
        return json({ success: false, error_code: "FORBIDDEN", error: "Not a member of this organization" }, 403);
      }
      const org = (profile as any).organizations;
      if (!org?.admin_approved || !org?.is_active) {
        return json({ success: false, error_code: "ORG_NOT_ACTIVE", error: "Organization is not active" }, 403);
      }

      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["dispensary_manager", "training_coordinator"]);
      if (!roleRow || roleRow.length === 0) {
        return json({ success: false, error_code: "FORBIDDEN", error: "Only Managers and Coordinators can purchase seats" }, 403);
      }

      organization_id = topup_organization_id!;
      quantity = Math.max(1, Math.floor(topup_quantity!));
      totalAmount = (quantity * PRICE_PER_SEAT).toFixed(2);
      // Per-request idempotency for top-ups (caller passes UUID; never reuses across attempts)
      idempotencyKey = `topup_${organization_id}_${client_idem_key ?? crypto.randomUUID()}`;
      contactEmail = profile.email ?? null;
      orgName = org.name ?? "your organization";
      applicationIdForMetadata = null;
    } else {
      // ===== Mode A: application-fee flow (unchanged) =====
      const { data: application, error: appError } = await supabase
        .from("dispensary_applications")
        .select(
          "id, organization_id, organization_name, contact_person, contact_email, estimated_employees, requested_credits, application_status, payment_status"
        )
        .eq("id", application_id!)
        .maybeSingle();

      if (appError || !application) {
        return json({ success: false, error_code: "APPLICATION_NOT_FOUND", error: "Application not found" });
      }

      if (application.application_status !== "approved" && application.application_status !== "completed") {
        return json({
          success: false,
          error_code: "APPLICATION_NOT_APPROVED",
          error: "Application is not yet approved",
        });
      }

      if (application.payment_status === "paid" || application.payment_status === "completed") {
        return json({
          success: false,
          error_code: "ALREADY_PAID",
          error: "This application has already been paid",
          already_paid: true,
        });
      }

      if (!application.organization_id) {
        return json({
          success: false,
          error_code: "ORG_NOT_LINKED",
          error: "Application is approved but no organization is linked. Contact support.",
        });
      }

      organization_id = application.organization_id;
      quantity = deriveQuantity({
        estimated_employees: application.estimated_employees,
        requested_credits: application.requested_credits,
      });
      totalAmount = (quantity * PRICE_PER_SEAT).toFixed(2);
      idempotencyKey = `app_${application_id}`;
      contactEmail = application.contact_email;
      orgName = application.organization_name;
      applicationIdForMetadata = application_id!;
    }

    // Idempotency: reuse any pending purchase for this app/top-up
    const { data: existingPurchase } = await supabase
      .from("rvt_purchases")
      .select("id, paypal_order_id, status, metadata")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingPurchase && existingPurchase.status === "paid") {
      return json({
        success: false,
        error_code: "ALREADY_PAID",
        error: "Payment already completed",
        already_paid: true,
      });
    }

    // PayPal env + credentials for this org
    const paypalEnv = await getPayPalEnvForOrg(organization_id);
    const { id: clientId, secret: clientSecret, baseUrl } = resolvePayPalCreds(paypalEnv);
    console.log(`[create-dispensary-payment-paypal] env=${paypalEnv} org=${organization_id} app=${applicationIdForMetadata} qty=${quantity} mode=${isTopUp ? "topup" : "application"}`);

    // Get / create purchase record FIRST so we have a stable purchase_id for custom_id
    let purchaseId = existingPurchase?.id ?? null;
    if (!purchaseId) {
      const { data: inserted, error: insertError } = await supabase
        .from("rvt_purchases")
        .insert({
          organization_id,
          quantity,
          amount_paid: totalAmount,
          currency: PAYMENT_CURRENCY,
          payment_method: "paypal",
          status: "pending",
          idempotency_key: idempotencyKey,
          metadata: {
            application_id,
            contact_email: application.contact_email,
            organization_name: application.organization_name,
            paypal_env: paypalEnv,
          },
        })
        .select("id")
        .single();

      if (insertError || !inserted) {
        console.error("[create-dispensary-payment-paypal] purchase insert failed:", insertError);
        return json({ success: false, error_code: "PURCHASE_INSERT_FAILED", error: insertError?.message }, 500);
      }
      purchaseId = inserted.id;
    }

    // PayPal access token
    const tokenRes = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[create-dispensary-payment-paypal] token failed", tokenData);
      return json({ success: false, error_code: "PAYPAL_TOKEN_FAILED", error: "PayPal auth failed" }, 502);
    }
    const accessToken = tokenData.access_token;

    // Use legacy underscore custom_id so verify-dispensary-payment-paypal continues parsing it.
    const customId = `purchase_${purchaseId}_org_${organization_id}_qty_${quantity}`;

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: purchaseId,
          custom_id: customId,
          description: `${quantity} ProCann Edu Training Seats for ${application.organization_name}`,
          amount: {
            currency_code: PAYMENT_CURRENCY,
            value: totalAmount,
          },
        },
      ],
      application_context: {
        brand_name: "ProCann Edu",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        return_url: `${DOMAINS.PRODUCTION}/payment-success?application_id=${application_id}&purchase_id=${purchaseId}`,
        cancel_url: `${DOMAINS.PRODUCTION}/payment-cancel?application_id=${application_id}`,
      },
    };

    const orderRes = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      console.error("[create-dispensary-payment-paypal] order creation failed", orderData);
      await supabase
        .from("rvt_purchases")
        .update({ status: "failed", metadata: { application_id, paypal_error: orderData } })
        .eq("id", purchaseId);
      return json({ success: false, error_code: "PAYPAL_ORDER_FAILED", error: orderData.message ?? "PayPal order failed" }, 502);
    }

    await supabase
      .from("rvt_purchases")
      .update({ paypal_order_id: orderData.id })
      .eq("id", purchaseId);

    await supabase.from("payment_events").insert({
      application_id,
      purchase_id: purchaseId,
      paypal_order_id: orderData.id,
      event_type: "ORDER_CREATED",
      amount: totalAmount,
      currency: PAYMENT_CURRENCY,
      status: "created",
      payload: { quantity, paypal_env: paypalEnv },
    });

    const approvalUrl = orderData.links?.find((l: any) => l.rel === "approve")?.href;
    if (!approvalUrl) {
      return json({ success: false, error_code: "NO_APPROVAL_URL", error: "PayPal approval URL missing" }, 502);
    }

    return json({
      success: true,
      url: approvalUrl,
      approvalUrl, // alias for backward compatibility
      orderId: orderData.id,
      purchaseId,
      quantity,
      amount: totalAmount,
    });
  } catch (err: any) {
    console.error("[create-dispensary-payment-paypal] unexpected", err);
    return json({ success: false, error_code: "INTERNAL_ERROR", error: err?.message ?? "Internal error" }, 500);
  }
});
