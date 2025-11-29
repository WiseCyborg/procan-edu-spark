import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentData {
  payment_id: string;
  organization_id: string;
  course_id: string;
  quantity: number;
  user_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { payment_id, organization_id, course_id, quantity, user_id }: PaymentData = await req.json();

    console.log(`Allocating ${quantity} seats for organization ${organization_id}`);

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, contact_email')
      .eq('id', organization_id)
      .single();

    // Create purchase record
    const { data: purchase, error: purchaseError } = await supabase
      .from('rvt_purchases')
      .insert({
        organization_id,
        quantity,
        amount_paid: quantity * 49.99,
        currency: 'USD',
        payment_method: 'paypal',
        status: 'paid',
        idempotency_key: payment_id,
        metadata: {
          paypal_payment_id: payment_id,
          allocated_by: user_id,
          allocation_type: 'paypal_purchase'
        }
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Create seats
    const seats = Array.from({ length: quantity }, () => ({
      purchase_id: purchase.id,
      organization_id,
      course_id,
      status: 'available',
    }));

    const { error: seatsError } = await supabase
      .from('rvt_seats')
      .insert(seats);

    if (seatsError) throw seatsError;

    // Generate join code if none exists
    const { data: existingCode } = await supabase
      .from('rvt_join_codes')
      .select('code')
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .maybeSingle();

    let joinCode = existingCode?.code;

    if (!joinCode) {
      const generatedCode = 'JOIN-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + 
        Math.random().toString(36).substring(2, 10).toUpperCase();

      const { data: newCode } = await supabase
        .from('rvt_join_codes')
        .insert({
          organization_id,
          code: generatedCode,
          max_uses: quantity * 3,
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true,
          created_by: user_id,
        })
        .select('code')
        .single();

      joinCode = newCode?.code;
    }

    // Log communication
    await supabase.from('communication_logs').insert({
      communication_type: 'seat_allocation',
      recipient_email: org?.contact_email || 'unknown',
      subject: 'Training Seats Allocated',
      content: `${quantity} training seats allocated for ${org?.name}`,
      delivery_status: 'sent',
      metadata: {
        purchase_id: purchase.id,
        join_code: joinCode,
        quantity,
      },
    });

    // Send confirmation email
    if (org?.contact_email) {
      await supabase.functions.invoke('send-seat-purchase-confirmation', {
        body: {
          email: org.contact_email,
          organizationName: org.name,
          quantity,
          joinCode,
          purchaseId: purchase.id,
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        purchase_id: purchase.id,
        seats_allocated: quantity,
        join_code: joinCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Seat allocation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
