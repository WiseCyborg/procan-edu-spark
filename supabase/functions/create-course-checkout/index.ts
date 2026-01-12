import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Course ID to Stripe Price ID mapping
const COURSE_PRICES: Record<string, string> = {
  // RVT Core
  "e6841a2f-4e92-47c3-9ed4-243ccc22338b": "price_1SoaZJGxpvth1Fpxz2kCZArd",
  // First Time at a Dispensary
  "fd6dc848-89a5-498e-a9e9-9647228fb532": "price_1SoaZKGxpvth1FpxQQxMQqVq",
  // Manager Compliance Training
  "11111111-1111-4111-a111-111111111111": "price_1SoaZMGxpvth1Fpxvd0ewFNm",
  // Ganjier Certification
  "22222222-2222-4222-a222-222222222222": "price_1SoaZNGxpvth1FpxoZeckvgz",
  // Sommelier Certification
  "33333333-3333-4333-a333-333333333333": "price_1SoaZPGxpvth1Fpxc7VhDGd9",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-COURSE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
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
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get course_id from request body
    const { course_id } = await req.json();
    if (!course_id) throw new Error("course_id is required");
    logStep("Course ID received", { course_id });

    // Get Stripe price for this course
    const priceId = COURSE_PRICES[course_id];
    if (!priceId) {
      throw new Error(`No Stripe price configured for course: ${course_id}`);
    }
    logStep("Stripe price found", { priceId });

    // Check if user already has entitlement
    const { data: existingEntitlement } = await supabaseClient
      .from("course_entitlements")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .eq("status", "active")
      .single();

    if (existingEntitlement) {
      return new Response(
        JSON.stringify({ error: "You already have access to this course" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    logStep("Stripe initialized");

    // Check if Stripe customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing Stripe customer found", { customerId });
    }

    // Create checkout session
    const origin = req.headers.get("origin") || "https://procannedu.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?course_id=${course_id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses?canceled=true`,
      metadata: {
        user_id: user.id,
        course_id: course_id,
        source: "procannedu",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
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
