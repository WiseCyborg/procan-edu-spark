import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getActivePayPalEnv, resolvePayPalCreds } from "../_shared/paypal-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { courseId } = await req.json();
    if (!courseId) {
      throw new Error("Course ID is required");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Service role: anon/authenticated cannot SELECT * on courses (provider id
    // columns are revoked), so the previous select('*') failed as "Course not found"
    // before PayPal was ever called. Charge only the stored price.
    const { data: course, error: courseError } = await supabaseService
      .from("courses")
      .select("id, title, price_cents, currency, payment_required, is_active")
      .eq("id", courseId)
      .maybeSingle();

    if (courseError || !course || course.is_active !== true) {
      throw new Error("Course not found");
    }
    if (!course.payment_required) {
      throw new Error("This course does not require payment");
    }
    if (typeof course.price_cents !== "number" || !Number.isInteger(course.price_cents) || course.price_cents <= 0) {
      throw new Error("Course price is not configured");
    }
    const currency = String(course.currency || "").trim();
    if (!currency) {
      throw new Error("Course currency is not configured");
    }

    const paypalEnv = await getActivePayPalEnv();
    const { id: PAYPAL_CLIENT_ID, secret: PAYPAL_CLIENT_SECRET, baseUrl: PAYPAL_API_BASE } =
      resolvePayPalCreds(paypalEnv);

    console.log(`Using PayPal ${paypalEnv} mode for course payment`);

    const paypalAuth = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`);

    const tokenResponse = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${paypalAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("[create-course-payment-paypal] token failed", tokenData);
      throw new Error("PayPal auth failed");
    }
    const accessToken = tokenData.access_token;

    // IDEMPOTENCY FIX (2026-08-07): reuse an existing still-approvable pending
    // order for this user+course instead of stacking a new PayPal order on
    // every click.
    const { data: existingPending } = await supabaseService
      .from("orders")
      .select("id, paypal_order_id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingPending?.paypal_order_id) {
      try {
        const existingRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${existingPending.paypal_order_id}`, {
          method: "GET",
          headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        });
        const existingData = await existingRes.json();
        if (existingRes.ok && existingData.status === "CREATED") {
          const reuseUrl = existingData.links?.find((l: any) => l.rel === "approve")?.href;
          if (reuseUrl) {
            return new Response(JSON.stringify({ url: reuseUrl, orderId: existingData.id, reused: true }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200,
            });
          }
        }
      } catch (e) {
        console.error("[create-course-payment-paypal] existing order reuse check failed", e);
        // fall through to create a fresh order
      }
    }

    const amount = (course.price_cents / 100).toFixed(2);

    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: courseId,
        amount: {
          currency_code: currency.toUpperCase(),
          value: amount,
        },
        description: `${course.title} - Course Access`,
        custom_id: `course_${courseId}_user_${user.id}`,
      }],
      application_context: {
        return_url: `https://www.procannedu.com/payment-success?course_id=${courseId}`,
        cancel_url: `https://www.procannedu.com/courses/${courseId}?payment=cancelled`,
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

    // CORRECTNESS FIX (2026-08-07): check the insert result instead of swallowing it.
    const { error: orderInsertErr } = await supabaseService.from("orders").insert({
      user_id: user.id,
      course_id: courseId,
      paypal_order_id: orderData.id,
      amount: course.price_cents,
      currency,
      status: "pending",
      metadata: {
        course_title: course.title,
        user_email: user.email,
        payment_method: "paypal"
      }
    });

    if (orderInsertErr) {
      console.error("[create-course-payment-paypal] orders insert failed", orderInsertErr);
      throw new Error(`Failed to record order: ${orderInsertErr.message}`);
    }

    const approvalUrl = orderData.links?.find((link: any) => link.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    const charged = orderData.purchase_units?.[0]?.amount;
    return new Response(JSON.stringify({
      url: approvalUrl,
      orderId: orderData.id,
      amount: charged?.value ?? amount,
      currency: charged?.currency_code ?? currency.toUpperCase(),
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
