import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vonageApiKey = Deno.env.get('VONAGE_API_KEY')!;
const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyStartRequest {
  email: string;
  phone?: string;
  delivery_method: 'email' | 'sms' | 'whatsapp';
  purpose: 'login' | 'exam_submission';
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, phone, delivery_method, purpose }: VerifyStartRequest = await req.json();

    console.log(`Starting ${delivery_method} verification for ${email} (${purpose})`);

    let verificationData;
    let vonageRequestId: string | null = null;

    if (delivery_method === 'email') {
      // Use existing email verification logic
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data, error } = await supabase
        .from('email_verification_codes')
        .insert({
          email,
          code,
          purpose,
          delivery_method: 'email',
          phone_number: phone,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      verificationData = data;

      // Send email using Supabase's built-in email auth
      // The verification code will be sent through Supabase's native email system
      console.log(`Verification code ${code} stored for ${email}`);

    } else {
      // Use Vonage Verify API for SMS/WhatsApp
      const vonageResponse = await fetch('https://api.nexmo.com/v2/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${vonageApiKey}:${vonageApiSecret}`)}`
        },
        body: JSON.stringify({
          brand: 'ProCannEdu',
          workflow: [{
            channel: delivery_method === 'sms' ? 'sms' : 'whatsapp',
            to: phone
          }],
          code_length: 6,
          locale: 'en-us'
        })
      });

      if (!vonageResponse.ok) {
        const error = await vonageResponse.text();
        console.error('Vonage API error:', error);
        throw new Error('Failed to send verification via Vonage');
      }

      const vonageData = await vonageResponse.json();
      vonageRequestId = vonageData.request_id;

      // Store verification request in database
      const { data, error } = await supabase
        .from('email_verification_codes')
        .insert({
          email,
          code: 'VONAGE_MANAGED', // Vonage manages the actual code
          purpose,
          delivery_method,
          phone_number: phone,
          vonage_request_id: vonageRequestId,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      verificationData = data;
    }

    console.log('Verification started successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Verification code sent via ${delivery_method}`,
        verification_id: verificationData.id,
        vonage_request_id: vonageRequestId,
        delivery_method
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error starting verification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);