import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const vonageApiKey = Deno.env.get('VONAGE_API_KEY')!;
const vonageApiSecret = Deno.env.get('VONAGE_API_SECRET')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerifyCheckRequest {
  email: string;
  code: string;
  purpose: 'login' | 'exam_submission';
  verification_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email, code, purpose, verification_id }: VerifyCheckRequest = await req.json();

    console.log(`Verifying code for ${email} (${purpose})`);

    // Find the verification record
    const { data: verificationData, error: fetchError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('purpose', purpose)
      .is('verified_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching verification code:', fetchError);
      throw new Error('Failed to verify code');
    }

    if (!verificationData) {
      return new Response(
        JSON.stringify({ verified: false, message: 'Invalid or expired code' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    let isValidCode = false;

    if (verificationData.delivery_method === 'email') {
      // Direct code comparison for email
      isValidCode = verificationData.code === code;
    } else {
      // Use Vonage Verify API to check SMS/WhatsApp codes
      if (!verificationData.vonage_request_id) {
        throw new Error('No Vonage request ID found for verification');
      }

      const vonageResponse = await fetch(`https://api.nexmo.com/v2/verify/${verificationData.vonage_request_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${vonageApiKey}:${vonageApiSecret}`)}`
        },
        body: JSON.stringify({
          code: code
        })
      });

      const vonageResult = await vonageResponse.json();
      isValidCode = vonageResponse.ok && vonageResult.status === 'completed';

      if (!isValidCode) {
        console.log('Vonage verification failed:', vonageResult);
      }
    }

    if (!isValidCode) {
      // Increment delivery attempts
      await supabase
        .from('email_verification_codes')
        .update({ 
          delivery_attempts: (verificationData.delivery_attempts || 0) + 1,
          delivery_status: 'failed'
        })
        .eq('id', verificationData.id);

      return new Response(
        JSON.stringify({ verified: false, message: 'Invalid verification code' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Mark code as verified
    const { error: updateError } = await supabase
      .from('email_verification_codes')
      .update({ 
        verified_at: new Date().toISOString(),
        delivery_status: 'completed'
      })
      .eq('id', verificationData.id);

    if (updateError) {
      console.error('Error updating verification code:', updateError);
      throw new Error('Failed to update verification status');
    }

    // Update user preferences if this was successful
    if (verificationData.delivery_method !== 'email') {
      const authHeader = req.headers.get('authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          await supabase
            .from('user_verification_preferences')
            .upsert({
              user_id: user.id,
              last_successful_method: verificationData.delivery_method,
              phone_number: verificationData.phone_number,
              updated_at: new Date().toISOString()
            });
        }
      }
    }

    console.log('Code verified successfully');

    return new Response(
      JSON.stringify({ 
        verified: true, 
        message: 'Code verified successfully',
        verification_id: verificationData.id,
        delivery_method: verificationData.delivery_method
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error verifying code:', error);
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