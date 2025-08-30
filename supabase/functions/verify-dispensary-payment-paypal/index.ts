import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// PayPal API base URLs
const PAYPAL_API_BASE = Deno.env.get("PAYPAL_ENVIRONMENT") === "production" 
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId } = await req.json();
    
    if (!orderId) {
      throw new Error("PayPal order ID is required");
    }

    // Get PayPal access token
    const paypalAuth = btoa(`${Deno.env.get("PAYPAL_CLIENT_ID")}:${Deno.env.get("PAYPAL_CLIENT_SECRET")}`);
    
    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${paypalAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get order details from PayPal
    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order verification error:", orderData);
      throw new Error(`PayPal order verification failed: ${orderData.message || "Unknown error"}`);
    }

    // Initialize Supabase service client
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if order is completed/approved
    if (orderData.status === "COMPLETED" || orderData.status === "APPROVED") {
      // Update order status in database
      const { error: updateError } = await supabaseService
        .from("orders")
        .update({ 
          status: "paid",
          updated_at: new Date().toISOString(),
          paypal_payer_id: orderData.payer?.payer_id,
          paypal_payment_id: orderData.purchase_units?.[0]?.payments?.captures?.[0]?.id
        })
        .eq("paypal_order_id", orderId);

      if (updateError) {
        console.error("Error updating order:", updateError);
        throw new Error("Failed to update order status");
      }

      // Extract application details from custom_id
      const customId = orderData.purchase_units?.[0]?.custom_id || "";
      const referenceId = orderData.purchase_units?.[0]?.reference_id;
      
      const applicationId = customId.split("dispensary_")[1]?.split("_credits_")[0] || referenceId;
      const credits = parseInt(customId.split("_credits_")[1]) || 0;

      if (!applicationId) {
        throw new Error("Application ID not found in payment data");
      }

      // Get application details
      const { data: application, error: appError } = await supabaseService
        .from('dispensary_applications')
        .select('*')
        .eq('id', applicationId)
        .single();

      if (appError || !application) {
        throw new Error("Application not found");
      }

      // Generate unique access key
      const { data: accessKeyData, error: keyError } = await supabaseService
        .rpc('generate_dispensary_key');

      if (keyError || !accessKeyData) {
        console.error("Error generating access key:", keyError);
        throw new Error("Failed to generate access key");
      }

      const accessKey = accessKeyData;

      // Create organization record
      const { data: organization, error: orgError } = await supabaseService
        .from("organizations")
        .insert({
          name: application.organization_name,
          contact_person: application.contact_person,
          contact_email: application.contact_email,
          contact_phone: application.contact_phone,
          address: application.address,
          license_number: application.license_number,
          unique_access_key: accessKey,
          course_credits: credits,
          payment_status: "paid",
          paypal_order_id: orderId,
          paypal_payer_id: orderData.payer?.payer_id,
          admin_approved: true,
          is_active: true
        })
        .select()
        .single();

      if (orgError) {
        console.error("Error creating organization:", orgError);
        throw new Error("Failed to create organization");
      }

      // Update application status to completed
      const { error: statusError } = await supabaseService
        .from("dispensary_applications")
        .update({ 
          application_status: "completed",
          updated_at: new Date().toISOString()
        })
        .eq("id", applicationId);

      if (statusError) {
        console.error("Error updating application status:", statusError);
      }

      // Send setup completion email using send-welcome-email function
      try {
        await supabaseService.functions.invoke('send-welcome-email', {
          body: {
            email: application.contact_email,
            userName: application.contact_person,
            dispensaryName: application.organization_name,
            accessKey: accessKey,
            credits: credits,
            isSetupComplete: true
          }
        });
      } catch (emailError) {
        console.error("Error sending setup email:", emailError);
        // Don't fail the entire process if email fails
      }

      return new Response(JSON.stringify({
        paid: true,
        accessKey,
        organizationId: organization.id,
        credits
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      // Payment not completed
      return new Response(JSON.stringify({ paid: false, status: orderData.status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error in verify-dispensary-payment-paypal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});