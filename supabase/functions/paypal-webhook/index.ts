// Issue 1001 — paypal-webhook rebuild
// Source of truth for dispensary payment provisioning.
// On CHECKOUT.ORDER.APPROVED / PAYMENT.CAPTURE.COMPLETED for a dispensary purchase:
//   1. Idempotency via payment_events.paypal_event_id UNIQUE
//   2. Mark rvt_purchases.status='paid'
//   3. Mark dispensary_applications.payment_status='paid' + payment_date
//   4. Issue rvt_seats (idempotent if any already exist for the purchase)
//   5. Resend manager-registration-token email so applicant can activate
//   6. Audit row in payment_events
// Failures are logged into payment_events with status='failed' and return 200 so
// PayPal doesn't retry-storm; admin can replay manually from the audit table.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getActivePayPalEnv, resolvePayPalCreds } from "../_shared/paypal-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource_type: string;
  resource: any;
  create_time: string;
  summary?: string;
}

async function getAccessToken(clientId: string, clientSecret: string, baseUrl: string) {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token failed: ${res.status}`);
  const data = await res.json();
  return data.access_token as string;
}

async function verifyWebhookSignature(
  headers: Headers,
  body: string,
  webhookId: string,
  baseUrl: string,
  accessToken: string
): Promise<boolean> {
  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const certUrl = headers.get("paypal-cert-url");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const authAlgo = headers.get("paypal-auth-algo");
  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !authAlgo) {
    console.error("[paypal-webhook] missing PayPal verification headers");
    return false;
  }
  try {
    const res = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });
    const result = await res.json();
    return result.verification_status === "SUCCESS";
  } catch (e) {
    console.error("[paypal-webhook] signature verification error", e);
    return false;
  }
}

/** Parse our legacy custom_id format: "purchase_{id}_org_{id}_qty_{n}" */
function parseDispensaryCustomId(customId: string | undefined | null) {
  if (!customId || !customId.startsWith("purchase_")) return null;
  const purchaseId = customId.split("purchase_")[1]?.split("_org_")[0];
  const organizationId = customId.split("_org_")[1]?.split("_qty_")[0];
  const quantity = parseInt(customId.split("_qty_")[1] || "0", 10);
  if (!purchaseId || !organizationId || !quantity) return null;
  return { purchaseId, organizationId, quantity };
}

async function provisionDispensaryPayment(
  supabase: ReturnType<typeof createClient>,
  ctx: { eventId: string; orderId: string; purchaseId: string; organizationId: string; quantity: number; captureId?: string; payerId?: string; amount?: string }
) {
  // 1. Idempotent purchase update
  const { data: purchase } = await supabase
    .from("rvt_purchases")
    .select("id, status, metadata, organization_id, quantity")
    .eq("id", ctx.purchaseId)
    .maybeSingle();

  if (!purchase) throw new Error(`Purchase not found: ${ctx.purchaseId}`);

  const alreadyPaid = purchase.status === "paid";
  const applicationId = (purchase.metadata as any)?.application_id ?? null;

  if (!alreadyPaid) {
    const { error: updateErr } = await supabase
      .from("rvt_purchases")
      .update({
        status: "paid",
        paypal_order_id: ctx.orderId,
        paypal_capture_id: ctx.captureId ?? null,
        paypal_payer_id: ctx.payerId ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq("id", ctx.purchaseId);
    if (updateErr) throw new Error(`purchase update failed: ${updateErr.message}`);
  }

  // 2. Mark application paid
  if (applicationId) {
    await supabase
      .from("dispensary_applications")
      .update({
        payment_status: "paid",
        payment_provider: "paypal",
        payment_transaction_id: ctx.captureId ?? ctx.orderId,
        payment_amount: ctx.amount ? Number(ctx.amount) : null,
        payment_date: new Date().toISOString(),
      })
      .eq("id", applicationId);
  }

  // 3. Issue seats — idempotent: skip if any already exist for this purchase
  const { count: existingSeatCount } = await supabase
    .from("rvt_seats")
    .select("id", { count: "exact", head: true })
    .eq("purchase_id", ctx.purchaseId);

  if (!existingSeatCount || existingSeatCount === 0) {
    const { data: defaultCourse } = await supabase
      .from("courses")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (defaultCourse?.id) {
      const seats = Array.from({ length: ctx.quantity }, () => ({
        purchase_id: ctx.purchaseId,
        organization_id: ctx.organizationId,
        course_id: defaultCourse.id,
        status: "available",
      }));
      const { error: seatErr } = await supabase.from("rvt_seats").insert(seats);
      if (seatErr) console.error("[paypal-webhook] seat insert error", seatErr);
    } else {
      console.warn("[paypal-webhook] no active course found — skipping seat issuance");
    }
  }

  // 4. Trigger manager-registration-token email so applicant can activate the account
  if (applicationId && !alreadyPaid) {
    try {
      await supabase.functions.invoke("send-manager-registration-token", {
        body: { application_id: applicationId },
      });
    } catch (e) {
      console.error("[paypal-webhook] failed to enqueue registration-token email", e);
    }
  }

  return { applicationId };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  let event: PayPalWebhookEvent | null = null;
  try {
    const rawBody = await req.text();
    event = JSON.parse(rawBody) as PayPalWebhookEvent;

    console.log("[paypal-webhook] event", { id: event.id, type: event.event_type });

    // Idempotency gate via payment_events.paypal_event_id UNIQUE
    const { error: insertErr } = await supabase.from("payment_events").insert({
      paypal_event_id: event.id,
      event_type: event.event_type,
      status: "received",
      payload: event as any,
    });
    if (insertErr && insertErr.code === "23505") {
      console.log("[paypal-webhook] duplicate event ignored", event.id);
      return new Response(JSON.stringify({ received: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (insertErr) {
      // Gate 4 fix (2026-06-20) — previously this branch was silent, which hid
      // a NOT-NULL constraint on stripe_event_id that was blocking every
      // PayPal event insert. Log loudly and fail the request so PayPal retries.
      console.error("[paypal-webhook] payment_events insert failed", insertErr);
      throw new Error(`payment_events insert failed: ${insertErr.message}`);
    }

    // P2 — Signature verification. In production the webhook ID MUST be present;
    // otherwise we reject the request so forged events cannot trigger provisioning.
    // In sandbox we log a warning and continue (developer ergonomics).
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    const env = await getActivePayPalEnv();
    const { id: clientId, secret: clientSecret, baseUrl } = resolvePayPalCreds(env);
    if (webhookId) {
      try {
        const accessToken = await getAccessToken(clientId, clientSecret, baseUrl);
        const ok = await verifyWebhookSignature(req.headers, rawBody, webhookId, baseUrl, accessToken);
        if (!ok) {
          await supabase
            .from("payment_events")
            .update({ status: "invalid_signature" })
            .eq("paypal_event_id", event.id);
          return new Response(JSON.stringify({ error: "invalid signature" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.error("[paypal-webhook] signature check threw", e);
        if (env === "production") {
          await supabase
            .from("payment_events")
            .update({ status: "signature_check_error" })
            .eq("paypal_event_id", event.id);
          return new Response(JSON.stringify({ error: "signature verification failed" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    } else if (env === "production") {
      console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID missing in production — rejecting event");
      await supabase
        .from("payment_events")
        .update({ status: "missing_webhook_id" })
        .eq("paypal_event_id", event.id);
      return new Response(JSON.stringify({ error: "webhook signature verification not configured" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      console.warn("[paypal-webhook] PAYPAL_WEBHOOK_ID not set (sandbox) — skipping signature verification");
    }

    // Route by event type
    switch (event.event_type) {
      case "CHECKOUT.ORDER.APPROVED":
      case "CHECKOUT.ORDER.COMPLETED":
      case "PAYMENT.CAPTURE.COMPLETED": {
        const resource = event.resource ?? {};
        const orderId =
          resource.supplementary_data?.related_ids?.order_id ??
          resource.id ??
          resource.purchase_units?.[0]?.reference_id;

        const customId =
          resource.custom_id ||
          resource.purchase_units?.[0]?.custom_id ||
          resource.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;

        const captureId =
          event.event_type === "PAYMENT.CAPTURE.COMPLETED"
            ? resource.id
            : resource.purchase_units?.[0]?.payments?.captures?.[0]?.id;

        const amount =
          resource.amount?.value ||
          resource.purchase_units?.[0]?.amount?.value ||
          resource.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;

        const currency =
          resource.amount?.currency_code ||
          resource.purchase_units?.[0]?.amount?.currency_code ||
          "USD";

        const payerId = resource.payer?.payer_id;

        const parsed = parseDispensaryCustomId(customId);

        if (parsed) {
          // Dispensary seat purchase
          const result = await provisionDispensaryPayment(supabase, {
            eventId: event.id,
            orderId,
            purchaseId: parsed.purchaseId,
            organizationId: parsed.organizationId,
            quantity: parsed.quantity,
            captureId,
            payerId,
            amount,
          });

          await supabase
            .from("payment_events")
            .update({
              status: "processed",
              application_id: result.applicationId,
              purchase_id: parsed.purchaseId,
              paypal_order_id: orderId,
              amount: amount ? Number(amount) : null,
              currency,
            })
            .eq("paypal_event_id", event.id);
        } else if (customId?.startsWith("course:") || customId?.startsWith("course_")) {
          // P3 — Course payment branch. Accept both formats:
          //   "course:{userId}:{courseId}"           (legacy)
          //   "course_{courseId}_user_{userId}"      (create-course-payment-paypal current)
          let userId: string | undefined;
          let courseId: string | undefined;

          if (customId.startsWith("course:")) {
            const [, u, c] = customId.split(":");
            userId = u;
            courseId = c;
          } else {
            // "course_{courseId}_user_{userId}"
            const m = customId.match(/^course_([^_]+(?:-[^_]+)*)_user_(.+)$/);
            if (m) {
              courseId = m[1];
              userId = m[2];
            }
          }

          if (userId && courseId) {
            await supabase
              .from("orders")
              .update({
                status: "completed",
                paypal_order_id: orderId,
                paid_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .eq("course_id", courseId)
              .eq("status", "pending");

            // ============================================================
            // Gate 4 fix (2026-06-20) — webhook is the authoritative path
            // for granting course access. Idempotent: UNIQUE(user_id,
            // course_id). If verify-payment-paypal already granted on the
            // buyer's return, this upsert is a no-op (and refreshes
            // metadata with the webhook event id for audit).
            // ============================================================
            const { data: orderRow } = await supabase
              .from("orders")
              .select("id, amount, currency")
              .eq("user_id", userId)
              .eq("course_id", courseId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            const { error: entErr } = await supabase
              .from("course_entitlements")
              .upsert({
                user_id: userId,
                course_id: courseId,
                source: "paypal",
                status: "active",
                purchased_at: new Date().toISOString(),
                metadata: {
                  paypal_order_id: orderId,
                  paypal_capture_id: captureId ?? null,
                  paypal_event_id: event.id,
                  order_id: orderRow?.id ?? null,
                  amount_cents: orderRow?.amount ?? null,
                  currency: (orderRow?.currency || currency || "usd").toLowerCase(),
                  granted_via: "paypal-webhook",
                },
              }, { onConflict: "user_id,course_id" });

            if (entErr) {
              console.error("[paypal-webhook] course entitlement upsert failed", entErr);
              throw new Error(`course entitlement upsert failed: ${entErr.message}`);
            }

            await supabase
              .from("payment_events")
              .update({ status: "processed", paypal_order_id: orderId })
              .eq("paypal_event_id", event.id);
          } else {
            console.warn("[paypal-webhook] could not parse course custom_id", customId);
            await supabase
              .from("payment_events")
              .update({ status: "unrecognized" })
              .eq("paypal_event_id", event.id);
          }
        } else {
          console.warn("[paypal-webhook] unrecognized custom_id format", customId);
          await supabase
            .from("payment_events")
            .update({ status: "unrecognized" })
            .eq("paypal_event_id", event.id);
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        await supabase
          .from("payment_events")
          .update({ status: event.event_type.toLowerCase() })
          .eq("paypal_event_id", event.id);
        break;
      }

      default:
        console.log("[paypal-webhook] unhandled event", event.event_type);
        await supabase
          .from("payment_events")
          .update({ status: "unhandled" })
          .eq("paypal_event_id", event.id);
    }

    return new Response(JSON.stringify({ received: true, event_id: event.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[paypal-webhook] processing error", err);
    if (event?.id) {
      await supabase
        .from("payment_events")
        .update({ status: "failed", error_message: err?.message ?? String(err) })
        .eq("paypal_event_id", event.id);
    }
    // Return 200 so PayPal doesn't retry-storm; admin can replay from payment_events
    return new Response(JSON.stringify({ received: true, error: err?.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
