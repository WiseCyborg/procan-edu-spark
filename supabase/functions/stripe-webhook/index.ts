import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Idempotency: Track processed events
const processedEvents = new Set<string>();

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
      console.error("Missing stripe-signature header");
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
        console.error("Webhook signature verification failed:", err);
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        });
      }
    } else {
      // Fallback for development - parse without verification
      console.warn("STRIPE_WEBHOOK_SECRET not configured - skipping signature verification");
      event = JSON.parse(body);
    }

    // Idempotency check - skip if already processed
    if (processedEvents.has(event.id)) {
      console.log(`Event ${event.id} already processed, skipping`);
      return new Response(JSON.stringify({ received: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Log the event to payment_events table
    const { error: logError } = await supabaseService
      .from("payment_events")
      .insert({
        stripe_event_id: event.id,
        event_type: event.type,
        session_id: (event.data.object as any).id || null,
        status: "received",
        payload: event.data.object,
      });

    if (logError) {
      console.error("Error logging payment event:", logError);
    }

    console.log(`Processing Stripe event: ${event.type} (${event.id})`);

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
        console.log(`Unhandled event type: ${event.type}`);
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
    console.error("Webhook processing error:", error);
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
  console.log(`Processing checkout.session.completed for session: ${session.id}`);

  // Update payment event status
  await supabase
    .from("payment_events")
    .update({ status: "processing" })
    .eq("stripe_event_id", eventId);

  try {
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
      console.warn(`No order found for session ${session.id}`);
      await supabase
        .from("payment_events")
        .update({ status: "failed", error_message: "Order not found" })
        .eq("stripe_event_id", eventId);
      return;
    }

    // Update order status to paid - THIS IS THE ONLY WAY TO GRANT ACCESS
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

    console.log(`Order ${order.id} marked as paid via webhook`);

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
        console.error("Failed to send confirmation email:", emailError);
      }
    }
  } catch (error) {
    console.error("Error processing checkout completion:", error);
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
  console.log(`Processing checkout.session.expired for session: ${session.id}`);

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
  console.log(`Processing payment_intent.payment_failed: ${paymentIntent.id}`);

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
  console.log(`Processing charge.refunded: ${charge.id}`);

  // Find order by payment intent
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("payment_transaction_id", charge.payment_intent)
    .maybeSingle();

  if (order) {
    await supabase
      .from("orders")
      .update({ 
        status: "refunded", 
        updated_at: new Date().toISOString() 
      })
      .eq("id", order.id);

    // Log for admin review
    console.log(`Order ${order.id} refunded - access should be revoked`);
  }

  await supabase
    .from("payment_events")
    .update({ status: "completed", processed_at: new Date().toISOString() })
    .eq("stripe_event_id", eventId);
}
