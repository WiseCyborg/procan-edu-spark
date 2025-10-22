import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the anon key for user authentication
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Parse request body to get course information
    const { courseId } = await req.json();
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get course details
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      throw new Error("Course not found");
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

    // Calculate amount (PayPal expects decimal format)
    const amount = ((course.price_cents || 4999) / 100).toFixed(2);

    // Create PayPal order
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: courseId,
        amount: {
          currency_code: (course.currency || "USD").toUpperCase(),
          value: amount,
        },
        description: `${course.title} - Course Access`,
        custom_id: `course_${courseId}_user_${user.id}`,
      }],
      application_context: {
        return_url: `${req.headers.get("origin")}/payment-success?course_id=${courseId}`,
        cancel_url: `${req.headers.get("origin")}/dashboard`,
        brand_name: "ProCann Edu",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    };

    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(orderPayload),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error("PayPal order creation error:", orderData);
      throw new Error(`PayPal order creation failed: ${orderData.message || "Unknown error"}`);
    }

    // Create order record in database
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("orders").insert({
      user_id: user.id,
      course_id: courseId,
      paypal_order_id: orderData.id,
      amount: course.price_cents || 4999,
      currency: course.currency || "usd",
      status: "pending",
      metadata: {
        course_title: course.title,
        user_email: user.email,
        payment_method: "paypal"
      }
    });

    // Find the approval URL from PayPal response
    const approvalUrl = orderData.links?.find((link: any) => link.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    return new Response(JSON.stringify({ 
      url: approvalUrl,
      orderId: orderData.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-course-payment-paypal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});