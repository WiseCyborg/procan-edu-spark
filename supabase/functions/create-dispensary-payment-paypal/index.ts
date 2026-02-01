import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPayPalEnvForOrg, resolvePayPalCreds } from "../_shared/paypal-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Initialize service client for privileged operations
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { quantity, idempotencyKey } = await req.json();
    
    if (!quantity || !idempotencyKey) {
      throw new Error("Quantity and idempotency key are required");
    }

    // Rate limit: 5 payment attempts per hour per IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const { data: rateLimitData } = await supabaseService.rpc('check_rate_limit', {
      _user_id: null,
      _action_type: `create_payment_${clientIp}`,
      _max_requests: 5,
      _window_minutes: 60
    });

    if (rateLimitData && rateLimitData.length > 0) {
      const remaining = rateLimitData[0].remaining;
      if (remaining <= 0) {
        console.warn(`[RATE LIMIT] IP ${clientIp} exceeded payment creation limit`);
        return new Response(
          JSON.stringify({ 
            error: 'Too many payment attempts. Please try again in 1 hour.',
            code: 'RATE_LIMIT_EXCEEDED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Verify user role
    const { data: hasPermission } = await supabaseService.rpc('has_any_role', {
      _user_id: user.id,
      _roles: ['dispensary_manager', 'training_coordinator']
    });

    if (!hasPermission) {
      throw new Error("Insufficient permissions. Only Managers and Coordinators can purchase seats.");
    }

    // Check idempotency - prevent duplicate orders
    const { data: existingPurchase } = await supabaseService
      .from('rvt_purchases')
      .select('*, paypal_order_id')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingPurchase) {
      console.log("Idempotency check: returning existing order", existingPurchase.paypal_order_id);
      
      // If order already exists and has PayPal order ID, return it
      if (existingPurchase.paypal_order_id) {
        return new Response(JSON.stringify({ 
          orderId: existingPurchase.paypal_order_id,
          message: "Order already exists"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Get user's organization
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('organization_id, organizations(*)')
      .eq('user_id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error("User is not associated with an organization");
    }

    const organization = profile.organizations;

    if (!organization.admin_approved) {
      throw new Error("Organization not yet approved by admin");
    }

    if (!organization.license_number) {
      throw new Error("Organization missing license number");
    }

    // Get PayPal environment for this organization (test orgs always use sandbox)
    const paypalEnv = await getPayPalEnvForOrg(organization.id);
    const { id: PAYPAL_CLIENT_ID, secret: PAYPAL_CLIENT_SECRET, baseUrl: PAYPAL_API_BASE } = 
      resolvePayPalCreds(paypalEnv);

    console.log(`Using PayPal ${paypalEnv} mode for organization ${organization.id}`);

    // Calculate amount
    const unitAmount = 49.99;
    const totalAmount = (quantity * unitAmount).toFixed(2);

    // Create pending purchase record BEFORE PayPal interaction
    const { data: purchase, error: purchaseError } = await supabaseService
      .from('rvt_purchases')
      .insert({
        organization_id: organization.id,
        quantity,
        amount_paid: totalAmount,
        currency: 'USD',
        payment_method: 'paypal',
        status: 'pending',
        idempotency_key: idempotencyKey,
        metadata: {
          user_id: user.id,
          user_email: user.email
        }
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error creating purchase record:", purchaseError);
      throw new Error("Failed to create purchase record");
    }

    console.log("Created purchase record:", purchase.id);

    // Get PayPal access token
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
    const accessToken = tokenData.access_token;

    // Create PayPal order with purchase_id in custom_id
    const orderPayload = {
      intent: "CAPTURE",
      purchase_units: [{
        reference_id: purchase.id,
        amount: {
          currency_code: "USD",
          value: totalAmount,
        },
        description: `${quantity} ProCann Edu Training Seats for ${organization.name}`,
        custom_id: `purchase_${purchase.id}_org_${organization.id}_qty_${quantity}`,
      }],
      application_context: {
        return_url: `https://www.procannedu.com/payment-success?purchase_id=${purchase.id}`,
        cancel_url: `https://www.procannedu.com/purchase-seats`,
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
      
      // Update purchase to failed
      await supabaseService
        .from('rvt_purchases')
        .update({ status: 'failed', metadata: { ...purchase.metadata, paypal_error: orderData } })
        .eq('id', purchase.id);
      
      throw new Error(`PayPal order creation failed: ${orderData.message || "Unknown error"}`);
    }

    // Update purchase with PayPal order ID
    await supabaseService
      .from('rvt_purchases')
      .update({ paypal_order_id: orderData.id })
      .eq('id', purchase.id);

    // Log audit event
    await supabaseService
      .from('payment_audit_log')
      .insert({
        order_id: orderData.id,
        event_type: 'ORDER_CREATED',
        event_data: {
          purchase_id: purchase.id,
          organization_id: organization.id,
          quantity,
          amount: totalAmount
        }
      });

    // Find the approval URL
    const approvalUrl = orderData.links?.find((link: any) => link.rel === "approve")?.href;

    if (!approvalUrl) {
      throw new Error("PayPal approval URL not found");
    }

    console.log("PayPal order created successfully:", orderData.id);

    return new Response(JSON.stringify({ 
      url: approvalUrl,
      orderId: orderData.id,
      purchaseId: purchase.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-dispensary-payment-paypal:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
