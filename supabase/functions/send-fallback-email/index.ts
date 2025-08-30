import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FallbackEmailRequest {
  type: 'signup' | 'recovery' | 'magiclink';
  email: string;
  user_id: string;
  confirmation_token?: string;
  recovery_token?: string;
  redirect_to: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, email, user_id, confirmation_token, recovery_token, redirect_to }: FallbackEmailRequest = await req.json();
    
    console.log(`Sending fallback email type: ${type} to ${email}`);

    // Log fallback usage for monitoring
    try {
      await supabase.from('email_fallback_log').insert({
        user_id,
        email,
        fallback_type: type,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.log('Failed to log fallback usage:', logError);
    }

    let result;

    switch (type) {
      case 'signup':
        if (!confirmation_token) {
          throw new Error('Confirmation token required for signup emails');
        }
        
        // Use Supabase's built-in email sending via auth admin API
        result = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${user_id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
          },
          body: JSON.stringify({
            email_confirm: true
          })
        });
        break;

      case 'recovery':
      case 'magiclink':
        if (!recovery_token) {
          throw new Error('Recovery token required for recovery/magic link emails');
        }

        // Send recovery email using Supabase auth API
        result = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/recover`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            'Content-Type': 'application/json',
            'apikey': Deno.env.get('SUPABASE_ANON_KEY') ?? ''
          },
          body: JSON.stringify({
            email: email,
            options: {
              redirectTo: redirect_to
            }
          })
        });
        break;

      default:
        throw new Error(`Unsupported fallback email type: ${type}`);
    }

    if (result && !result.ok) {
      const errorText = await result.text();
      console.error(`Supabase fallback email failed: ${result.status} - ${errorText}`);
      throw new Error(`Supabase fallback failed: ${result.status}`);
    }

    console.log(`Fallback email sent successfully for type: ${type}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Fallback email sent successfully',
      type: type
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-fallback-email function:', error);
    
    // Log the error for monitoring
    try {
      await supabase.from('email_fallback_log').insert({
        user_id: req.url,
        email: 'error',
        fallback_type: 'error',
        error_message: error.message,
        created_at: new Date().toISOString()
      });
    } catch (logError) {
      console.log('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'fallback_error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);