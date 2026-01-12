import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-COURSE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    // Get session_id and course_id from request
    const { session_id, course_id } = await req.json();
    if (!session_id || !course_id) {
      throw new Error("session_id and course_id are required");
    }
    logStep("Request params", { session_id, course_id });

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Session retrieved", { 
      status: session.payment_status, 
      metadata: session.metadata 
    });

    // Verify payment was successful
    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ success: false, error: "Payment not completed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Verify the session is for the correct user and course
    if (session.metadata?.user_id !== user.id || session.metadata?.course_id !== course_id) {
      logStep("Metadata mismatch", { 
        expected: { user_id: user.id, course_id },
        actual: session.metadata 
      });
      return new Response(
        JSON.stringify({ success: false, error: "Payment verification failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if entitlement already exists (idempotency)
    const { data: existingEntitlement } = await supabaseClient
      .from("course_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .single();

    if (existingEntitlement) {
      logStep("Entitlement already exists", { id: existingEntitlement.id });
      return new Response(
        JSON.stringify({ success: true, already_existed: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create the entitlement
    const { data: newEntitlement, error: insertError } = await supabaseClient
      .from("course_entitlements")
      .insert({
        user_id: user.id,
        course_id: course_id,
        source: "stripe",
        status: "active",
        stripe_checkout_session_id: session_id,
        stripe_payment_intent_id: session.payment_intent as string,
        purchased_at: new Date().toISOString(),
        metadata: {
          amount_total: session.amount_total,
          currency: session.currency,
          customer_email: session.customer_email,
        },
      })
      .select()
      .single();

    if (insertError) {
      logStep("Insert error", { error: insertError.message });
      throw new Error(`Failed to create entitlement: ${insertError.message}`);
    }

    logStep("Entitlement created", { id: newEntitlement.id });

    return new Response(
      JSON.stringify({ 
        success: true, 
        entitlement_id: newEntitlement.id,
        course_id: course_id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
