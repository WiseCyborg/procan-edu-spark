import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Idempotency: Track processed events
const processedEvents = new Set<string>();

const log = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
  });

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Get the raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature) {
      log("ERROR", { message: "Missing stripe-signature header" });
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let event: Stripe.Event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        log("ERROR", { message: "Webhook signature verification failed", error: err });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    } else {
      // Fallback for development - parse without verification
      log("WARN", { message: "STRIPE_WEBHOOK_SECRET not configured - skipping signature verification" });
      event = JSON.parse(body);
    }

    // Idempotency check - skip if already processed
    if (processedEvents.has(event.id)) {
      log("Skipped duplicate event", { eventId: event.id });
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Log the event to payment_events table (if it exists)
    try {
      await supabaseService
        .from("payment_events")
        .insert({
          stripe_event_id: event.id,
          event_type: event.type,
          session_id: (event.data.object as any).id || null,
          status: "received",
          payload: event.data.object,
        });
    } catch (logError) {
      log("WARN", { message: "Could not log to payment_events", error: logError });
    }

    log("Processing event", { type: event.type, id: event.id });

    // Handle specific event types
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabaseService, session, event.id);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(supabaseService, session, event.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentFailed(supabaseService, paymentIntent, event.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleRefund(supabaseService, charge, event.id);
        break;
      }

      default:
        log("Unhandled event type", { type: event.type });
    }

    // Mark event as processed
    processedEvents.add(event.id);

    // Clean up old processed events (keep last 1000)
    if (processedEvents.size > 1000) {
      const iterator = processedEvents.values();
      for (let i = 0; i < 100; i++) {
        processedEvents.delete(iterator.next().value);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    log("ERROR", { message: "Webhook processing error", error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function handleCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  log("Processing checkout.session.completed", { sessionId: session.id, metadata: session.metadata });

  try {
    // Check if this is a course entitlement purchase (new flow)
    const metadata = session.metadata || {};
    const userId = metadata.user_id;
    const courseId = metadata.course_id;
    const source = metadata.source;

    if (userId && courseId && source === "procannedu") {
      // NEW FLOW: Create course entitlement
      log("Creating course entitlement", { userId, courseId });
      
      // Check if entitlement already exists (idempotency)
      const { data: existingEntitlement } = await supabase
        .from("course_entitlements")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existingEntitlement) {
        log("Entitlement already exists", { id: existingEntitlement.id });
        return;
      }

      // Create the entitlement
      const { data: newEntitlement, error: insertError } = await supabase
        .from("course_entitlements")
        .insert({
          user_id: userId,
          course_id: courseId,
          source: "stripe",
          status: "active",
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          purchased_at: new Date().toISOString(),
          metadata: {
            amount_total: session.amount_total,
            currency: session.currency,
            customer_email: session.customer_email,
            stripe_event_id: eventId,
          },
        })
        .select()
        .single();

      if (insertError) {
        log("ERROR", { message: "Failed to create entitlement", error: insertError.message });
        throw new Error(`Failed to create entitlement: ${insertError.message}`);
      }

      log("Entitlement created successfully", { 
        entitlementId: newEntitlement.id, 
        userId, 
        courseId 
      });

      // Send confirmation email if customer email available
      if (session.customer_email) {
        try {
          // Get course title for email
          const { data: course } = await supabase
            .from("courses")
            .select("title")
            .eq("id", courseId)
            .single();

          await supabase.functions.invoke("send-payment-confirmation", {
            body: {
              email: session.customer_email,
              courseTitle: course?.title || "Course",
              amount: session.amount_total,
            },
          });
          log("Confirmation email sent", { email: session.customer_email });
        } catch (emailError) {
          log("WARN", { message: "Failed to send confirmation email", error: emailError });
        }
      }

      return;
    }

    // LEGACY FLOW: Handle orders table
    // Update payment event status
    await supabase
      .from("payment_events")
      .update({ status: "processing" })
      .eq("stripe_event_id", eventId);

    // Find and update the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .maybeSingle();

    if (orderError) {
      throw new Error(`Order lookup failed: ${orderError.message}`);
    }

    if (!order) {
      log("WARN", { message: "No order found for session", sessionId: session.id });
      await supabase
        .from("payment_events")
        .update({ status: "failed", error_message: "Order not found" })
        .eq("stripe_event_id", eventId);
      return;
    }

    // Update order status to paid
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "paid",
        updated_at: new Date().toISOString(),
        payment_provider: "stripe",
        payment_transaction_id: session.payment_intent,
      })
      .eq("id", order.id);

    if (updateError) {
      throw new Error(`Order update failed: ${updateError.message}`);
    }

    // Link payment event to order
    await supabase
      .from("payment_events")
      .update({ 
        order_id: order.id, 
        user_id: order.user_id,
        status: "completed",
        processed_at: new Date().toISOString()
      })
      .eq("stripe_event_id", eventId);

    log("Order marked as paid", { orderId: order.id });

    // Trigger confirmation email
    if (session.customer_email) {
      try {
        await supabase.functions.invoke("send-payment-confirmation", {
          body: {
            email: session.customer_email,
            orderId: order.id,
            courseId: order.course_id,
            amount: session.amount_total,
          },
        });
      } catch (emailError) {
        log("WARN", { message: "Failed to send confirmation email", error: emailError });
      }
    }
  } catch (error) {
    log("ERROR", { message: "Error processing checkout completion", error: error.message });
    await supabase
      .from("payment_events")
      .update({ 
        status: "failed", 
        error_message: error.message 
      })
      .eq("stripe_event_id", eventId);
  }
}

async function handleCheckoutExpired(
  supabase: any,
  session: Stripe.Checkout.Session,
  eventId: string
) {
  log("Processing checkout.session.expired", { sessionId: session.id });

  // Update any pending orders
  await supabase
    .from("orders")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("stripe_session_id", session.id)
    .eq("status", "pending");

  await supabase
    .from("payment_events")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("stripe_event_id", eventId);
}

async function handlePaymentFailed(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent,
  eventId: string
) {
  log("Processing payment_intent.payment_failed", { paymentIntentId: paymentIntent.id });

  // Find order by payment intent
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_transaction_id", paymentIntent.id)
    .maybeSingle();

  if (order) {
    await supabase
      .from("orders")
      .update({ 
        status: "failed", 
        updated_at: new Date().toISOString(),
        error_message: paymentIntent.last_payment_error?.message 
      })
      .eq("id", order.id);
  }

  await supabase
    .from("payment_events")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("stripe_event_id", eventId);
}

async function handleRefund(
  supabase: any,
  charge: Stripe.Charge,
  eventId: string
) {
  log("Processing charge.refunded", { chargeId: charge.id, paymentIntent: charge.payment_intent });

  const paymentIntentId = charge.payment_intent as string;

  // HANDLE NEW FLOW: Revoke course entitlement
  const { data: entitlement } = await supabase
    .from("course_entitlements")
    .select("id, user_id, course_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();

  if (entitlement) {
    // Revoke entitlement
    await supabase
      .from("course_entitlements")
      .update({ 
        status: "revoked",
        metadata: supabase.sql`metadata || '{"revoked_reason": "refund", "revoked_at": "${new Date().toISOString()}"}'::jsonb`
      })
      .eq("id", entitlement.id);

    log("Entitlement revoked due to refund", { 
      entitlementId: entitlement.id,
      userId: entitlement.user_id,
      courseId: entitlement.course_id
    });
  }

  // LEGACY FLOW: Handle orders
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_transaction_id", paymentIntentId)
    .maybeSingle();

  if (order) {
    await supabase
      .from("orders")
      .update({ 
        status: "refunded", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", order.id);

    log("Order refunded", { orderId: order.id });
  }

  await supabase
    .from("payment_events")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("stripe_event_id", eventId);
}
