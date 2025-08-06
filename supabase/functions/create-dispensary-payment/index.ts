import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId, credits } = await req.json();
    
    if (!applicationId || !credits) {
      throw new Error("Application ID and credits are required");
    }

    // Initialize Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get application details
    const { data: application, error: appError } = await supabaseService
      .from('dispensary_applications')
      .select('*')
      .eq('id', applicationId)
      .eq('application_status', 'approved')
      .single();

    if (appError || !application) {
      throw new Error("Application not found or not approved");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ 
      email: application.contact_email, 
      limit: 1 
    });
    
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: application.contact_email,
        name: application.contact_person,
        metadata: {
          organization_name: application.organization_name,
          license_number: application.license_number || '',
        }
      });
      customerId = customer.id;
    }

    // Calculate amount (credits * $49.99)
    const unitAmount = 4999; // $49.99 in cents
    const totalAmount = credits * unitAmount;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `ProCann Edu Training Licenses`,
              description: `${credits} employee training licenses for ${application.organization_name}`,
            },
            unit_amount: unitAmount,
          },
          quantity: credits,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/auth?role=dispensary`,
      metadata: {
        application_id: applicationId,
        organization_name: application.organization_name,
        credits: credits.toString(),
      },
    });

    // Create order record
    const { error: orderError } = await supabaseService
      .from("orders")
      .insert({
        stripe_session_id: session.id,
        stripe_customer_id: customerId,
        amount: totalAmount,
        currency: "usd",
        status: "pending",
        metadata: {
          application_id: applicationId,
          organization_name: application.organization_name,
          credits: credits,
          type: "dispensary_bulk_training"
        }
      });

    if (orderError) {
      console.error("Error creating order:", orderError);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-dispensary-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});