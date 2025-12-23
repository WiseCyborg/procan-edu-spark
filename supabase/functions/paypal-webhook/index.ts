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
  resource: {
    id: string;
    status: string;
    custom_id?: string;
    purchase_units?: Array<{
      custom_id?: string;
      reference_id?: string;
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: { value: string; currency_code: string };
        }>;
      };
    }>;
    payer?: {
      email_address?: string;
      payer_id?: string;
    };
    amount?: {
      value: string;
      currency_code: string;
    };
  };
  create_time: string;
  summary?: string;
}

/**
 * Verify PayPal webhook signature
 */
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
    console.error("[paypal-webhook] Missing required PayPal headers");
    return false;
  }

  try {
    const verifyResponse = await fetch(`${baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
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

    const result = await verifyResponse.json();
    console.log("[paypal-webhook] Signature verification result:", result.verification_status);
    return result.verification_status === "SUCCESS";
  } catch (error) {
    console.error("[paypal-webhook] Signature verification failed:", error);
    return false;
  }
}

/**
 * Get PayPal access token
 */
async function getAccessToken(clientId: string, clientSecret: string, baseUrl: string): Promise<string> {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const rawBody = await req.text();
    const event: PayPalWebhookEvent = JSON.parse(rawBody);

    console.log("[paypal-webhook] Received event:", {
      id: event.id,
      type: event.event_type,
      resourceId: event.resource?.id,
    });

    // Log webhook receipt
    await supabase.from("security_audit_log").insert({
      table_name: "paypal_webhooks",
      action_type: "WEBHOOK_RECEIVED",
      new_values: {
        event_id: event.id,
        event_type: event.event_type,
        resource_id: event.resource?.id,
      },
    });

    // Get PayPal environment and credentials
    const env = await getActivePayPalEnv();
    const { id: clientId, secret: clientSecret, baseUrl } = resolvePayPalCreds(env);

    // Verify webhook signature if PAYPAL_WEBHOOK_ID is configured
    const webhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    if (webhookId) {
      const accessToken = await getAccessToken(clientId, clientSecret, baseUrl);
      const isValid = await verifyWebhookSignature(req.headers, rawBody, webhookId, baseUrl, accessToken);
      
      if (!isValid) {
        console.error("[paypal-webhook] Invalid signature - rejecting webhook");
        await supabase.from("security_audit_log").insert({
          table_name: "paypal_webhooks",
          action_type: "WEBHOOK_SIGNATURE_INVALID",
          new_values: { event_id: event.id },
        });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[paypal-webhook] PAYPAL_WEBHOOK_ID not configured - skipping signature verification");
    }

    // Handle specific event types
    switch (event.event_type) {
      case "CHECKOUT.ORDER.COMPLETED":
      case "CHECKOUT.ORDER.APPROVED": {
        const orderId = event.resource.id;
        const customId = event.resource.custom_id || 
          event.resource.purchase_units?.[0]?.custom_id;

        console.log("[paypal-webhook] Processing order completion:", { orderId, customId });

        // Check if this is a course payment or dispensary seat purchase
        if (customId) {
          // Parse custom_id: format is "purchaseId:orgId:quantity" for dispensary
          // or "course:userId:courseId" for course payments
          const parts = customId.split(":");
          
          if (parts.length >= 3 && parts[0] !== "course") {
            // Dispensary seat purchase
            const [purchaseId, organizationId, quantity] = parts;
            
            // Update rvt_purchases table
            const { error: updateError } = await supabase
              .from("rvt_purchases")
              .update({
                status: "paid",
                paypal_order_id: orderId,
                payment_completed_at: new Date().toISOString(),
              })
              .eq("id", purchaseId);

            if (updateError) {
              console.error("[paypal-webhook] Failed to update purchase:", updateError);
            } else {
              console.log("[paypal-webhook] Updated rvt_purchase:", purchaseId);
            }
          } else if (parts[0] === "course") {
            // Course payment
            const [, userId, courseId] = parts;
            
            // Update orders table
            const { error: updateError } = await supabase
              .from("orders")
              .update({
                status: "completed",
                paypal_order_id: orderId,
                paid_at: new Date().toISOString(),
              })
              .eq("user_id", userId)
              .eq("course_id", courseId)
              .eq("status", "pending");

            if (updateError) {
              console.error("[paypal-webhook] Failed to update order:", updateError);
            } else {
              console.log("[paypal-webhook] Updated order for user:", userId);
              
              // Grant course access by creating enrollment
              await supabase.from("course_progress").upsert({
                user_id: userId,
                course_id: courseId,
                progress_percentage: 0,
                current_module: 1,
              }, { onConflict: "user_id,course_id" });
            }
          }
        }

        // Log successful processing
        await supabase.from("security_audit_log").insert({
          table_name: "paypal_webhooks",
          action_type: "PAYMENT_COMPLETED",
          new_values: {
            event_id: event.id,
            order_id: orderId,
            custom_id: customId,
          },
        });
        break;
      }

      case "PAYMENT.CAPTURE.COMPLETED": {
        const captureId = event.resource.id;
        const amount = event.resource.amount;
        
        console.log("[paypal-webhook] Payment captured:", {
          captureId,
          amount: amount?.value,
          currency: amount?.currency_code,
        });

        await supabase.from("security_audit_log").insert({
          table_name: "paypal_webhooks",
          action_type: "PAYMENT_CAPTURED",
          new_values: {
            capture_id: captureId,
            amount: amount?.value,
            currency: amount?.currency_code,
          },
        });
        break;
      }

      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.REFUNDED": {
        console.log("[paypal-webhook] Payment status change:", event.event_type);
        
        await supabase.from("security_audit_log").insert({
          table_name: "paypal_webhooks",
          action_type: event.event_type,
          new_values: {
            event_id: event.id,
            resource_id: event.resource.id,
          },
        });
        break;
      }

      default:
        console.log("[paypal-webhook] Unhandled event type:", event.event_type);
    }

    return new Response(JSON.stringify({ received: true, event_id: event.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[paypal-webhook] Error processing webhook:", error);
    
    await supabase.from("security_audit_log").insert({
      table_name: "paypal_webhooks",
      action_type: "WEBHOOK_ERROR",
      new_values: {
        error: error.message,
      },
    });

    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
