import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === "paid") {
      // Initialize Supabase service client
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Update order status
      const { error: orderError } = await supabaseService
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString()
        })
        .eq("stripe_session_id", sessionId);

      if (orderError) {
        console.error("Error updating order status:", orderError);
      }

      // Get application ID from metadata
      const applicationId = session.metadata?.application_id;
      const credits = parseInt(session.metadata?.credits || "0");
      const organizationName = session.metadata?.organization_name;

      if (applicationId && credits > 0) {
        // Generate unique access key
        const { data: keyData, error: keyError } = await supabaseService
          .rpc('generate_dispensary_key');

        if (keyError) {
          console.error("Error generating dispensary key:", keyError);
          throw new Error("Failed to generate access key");
        }

        const accessKey = keyData;

        // Create organization record
        const { data: orgData, error: orgError } = await supabaseService
          .from('organizations')
          .insert({
            name: organizationName,
            unique_access_key: accessKey,
            payment_status: 'paid',
            course_credits: credits,
            admin_approved: true,
            stripe_session_id: sessionId,
            stripe_customer_id: session.customer,
            is_active: true
          })
          .select()
          .single();

        if (orgError) {
          console.error("Error creating organization:", orgError);
          throw new Error("Failed to create organization");
        }

        // Update application status
        const { error: appError } = await supabaseService
          .from('dispensary_applications')
          .update({ 
            application_status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('id', applicationId);

        if (appError) {
          console.error("Error updating application:", appError);
        }

        // Send dispensary setup completion email using send-welcome-email function
        try {
          await supabaseService.functions.invoke('send-welcome-email', {
            body: {
              email: session.customer_details?.email,
              userName: organizationName,
              dispensaryName: organizationName,
              accessKey,
              credits,
              isSetupComplete: true
            }
          });
        } catch (emailError) {
          console.error("Error sending setup email:", emailError);
        }

        return new Response(JSON.stringify({ 
          paid: true, 
          accessKey,
          organizationId: orgData.id,
          credits
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    return new Response(JSON.stringify({ paid: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in verify-dispensary-payment:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});