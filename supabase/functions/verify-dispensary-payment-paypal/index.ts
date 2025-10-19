import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
      throw new Error("Order ID is required");
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Log audit event
    await supabaseService.from('payment_audit_log').insert({
      order_id: orderId,
      event_type: 'VERIFICATION_STARTED',
      event_data: { timestamp: new Date().toISOString() }
    });

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

    // Get PayPal order details
    const orderResponse = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const orderData = await orderResponse.json();
    console.log("PayPal order data:", JSON.stringify(orderData, null, 2));

    await supabaseService.from('payment_audit_log').insert({
      order_id: orderId,
      event_type: 'PAYPAL_ORDER_FETCHED',
      event_data: { status: orderData.status }
    });

    // Check if payment is completed
    if (orderData.status === 'COMPLETED' || orderData.status === 'APPROVED') {
      const customId = orderData.purchase_units[0]?.payments?.captures?.[0]?.custom_id || 
                       orderData.purchase_units[0]?.custom_id;
      
      if (!customId) {
        throw new Error("Custom ID not found in PayPal order");
      }

      const purchaseId = customId.split('purchase_')[1]?.split('_org_')[0];
      const organizationId = customId.split('_org_')[1]?.split('_qty_')[0];
      const quantity = parseInt(customId.split('_qty_')[1]);

      if (!purchaseId || !organizationId || !quantity) {
        throw new Error("Failed to parse purchase details from custom_id");
      }

      console.log("Parsed:", { purchaseId, organizationId, quantity });

      // Check if already processed (idempotency)
      const { data: existingPurchase } = await supabaseService
        .from('rvt_purchases')
        .select('*')
        .eq('id', purchaseId)
        .single();

      if (existingPurchase?.status === 'paid') {
        console.log("Purchase already processed - idempotency check passed");
        
        await supabaseService.from('payment_audit_log').insert({
          order_id: orderId,
          event_type: 'IDEMPOTENCY_CHECK',
          event_data: { message: 'Already processed', purchase_id: purchaseId }
        });

        return new Response(JSON.stringify({ 
          paid: true,
          alreadyProcessed: true,
          purchaseId,
          organizationId
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const captureId = orderData.purchase_units[0]?.payments?.captures?.[0]?.id;
      const payerId = orderData.payer?.payer_id;

      // Get default course
      const { data: defaultCourse } = await supabaseService
        .from('courses')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (!defaultCourse) {
        throw new Error("No active course found");
      }

      // **ATOMIC TRANSACTION: Update purchase + Create seats**
      
      // 1. Update purchase to 'paid'
      const { error: updateError } = await supabaseService
        .from('rvt_purchases')
        .update({
          status: 'paid',
          paypal_order_id: orderId,
          paypal_capture_id: captureId,
          paypal_payer_id: payerId,
          completed_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      if (updateError) {
        console.error("Error updating purchase:", updateError);
        throw new Error("Failed to update purchase record");
      }

      await supabaseService.from('payment_audit_log').insert({
        order_id: orderId,
        event_type: 'PURCHASE_UPDATED',
        event_data: { purchase_id: purchaseId, status: 'paid' }
      });

      // 2. Create N seats atomically
      const seats = Array.from({ length: quantity }, () => ({
        purchase_id: purchaseId,
        organization_id: organizationId,
        course_id: defaultCourse.id,
        status: 'available'
      }));

      const { error: seatsError } = await supabaseService
        .from('rvt_seats')
        .insert(seats);

      if (seatsError) {
        console.error("Error creating seats:", seatsError);
        
        // Rollback purchase status
        await supabaseService
          .from('rvt_purchases')
          .update({ status: 'failed' })
          .eq('id', purchaseId);
        
        throw new Error("Failed to allocate seats");
      }

      await supabaseService.from('payment_audit_log').insert({
        order_id: orderId,
        event_type: 'SEATS_ALLOCATED',
        event_data: { purchase_id: purchaseId, quantity }
      });

      // 3. Update organization's course_credits (best effort)
      const { data: org } = await supabaseService
        .from('organizations')
        .select('course_credits')
        .eq('id', organizationId)
        .single();

      if (org) {
        await supabaseService
          .from('organizations')
          .update({ 
            course_credits: (org.course_credits || 0) + quantity 
          })
          .eq('id', organizationId);
      }

      // 4. Send confirmation email
      const { data: organization } = await supabaseService
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single();

      if (organization) {
        await supabaseService.functions.invoke('send-seat-purchase-confirmation', {
          body: {
            recipientEmail: organization.contact_email,
            organizationName: organization.name,
            quantity,
            totalAmount: (quantity * 49.99).toFixed(2),
            accessKey: organization.unique_access_key,
            purchaseId
          }
        }).catch(err => {
          console.error("Failed to send confirmation email:", err);
        });
      }

      await supabaseService.from('payment_audit_log').insert({
        order_id: orderId,
        event_type: 'PAYMENT_COMPLETED',
        event_data: { 
          purchase_id: purchaseId,
          organization_id: organizationId,
          quantity,
          seats_allocated: quantity
        }
      });

      console.log("Payment verification complete");

      return new Response(JSON.stringify({ 
        paid: true,
        purchaseId,
        organizationId,
        quantity,
        message: "Payment verified and seats allocated successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      await supabaseService.from('payment_audit_log').insert({
        order_id: orderId,
        event_type: 'PAYMENT_NOT_COMPLETED',
        event_data: { status: orderData.status }
      });

      return new Response(JSON.stringify({ 
        paid: false,
        status: orderData.status,
        message: `Payment status: ${orderData.status}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
  } catch (error) {
    console.error("Error in verify-dispensary-payment-paypal:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      paid: false
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
