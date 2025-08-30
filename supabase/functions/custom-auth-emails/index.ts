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

interface AuthWebhookEvent {
  type: string;
  table: string;
  record: any;
  schema: string;
  old_record?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookEvent: AuthWebhookEvent = await req.json();
    console.log('Auth webhook received:', webhookEvent);

    // Handle different auth events
    switch (webhookEvent.type) {
      case 'INSERT':
        if (webhookEvent.table === 'users') {
          await handleNewUserSignup(webhookEvent.record);
        }
        break;
      
      case 'UPDATE':
        if (webhookEvent.table === 'users') {
          await handleUserUpdate(webhookEvent.record, webhookEvent.old_record);
        }
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in custom-auth-emails function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function handleNewUserSignup(user: any) {
  console.log('Handling new user signup:', user.email);
  
  // Only send custom email if user needs email confirmation
  if (!user.email_confirmed_at && user.confirmation_token) {
    const confirmationLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${user.confirmation_token}&type=signup&redirect_to=${encodeURIComponent('https://procannedu.com/dashboard')}`;
    
    // Call our branded email function
    const emailResponse = await supabase.functions.invoke('send-branded-email', {
      body: {
        to: user.email,
        subject: 'Confirm Your ProCann Edu Account',
        type: 'email-confirmation',
        data: {
          firstName: user.raw_user_meta_data?.first_name || '',
          confirmationLink: confirmationLink
        }
      }
    });

    console.log('Confirmation email sent:', emailResponse);
  }
}

async function handleUserUpdate(user: any, oldUser: any) {
  console.log('Handling user update:', user.email);
  
  // Handle password reset emails
  if (user.recovery_token && !oldUser?.recovery_token) {
    const resetLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${user.recovery_token}&type=recovery&redirect_to=${encodeURIComponent('https://procannedu.com/auth?mode=reset')}`;
    
    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();
    
    // Call our branded email function
    const emailResponse = await supabase.functions.invoke('send-branded-email', {
      body: {
        to: user.email,
        subject: 'Reset Your ProCann Edu Password',
        type: 'password-reset',
        data: {
          firstName: profile?.first_name || user.raw_user_meta_data?.first_name || '',
          resetLink: resetLink
        }
      }
    });

    console.log('Password reset email sent:', emailResponse);
  }

  // Handle magic link emails
  if (user.recovery_token && user.recovery_sent_at && !oldUser?.recovery_sent_at) {
    // Check if this is a magic link request (not password reset)
    const timeDiff = new Date(user.recovery_sent_at).getTime() - new Date(user.updated_at).getTime();
    
    if (Math.abs(timeDiff) < 5000) { // Within 5 seconds, likely magic link
      const magicLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${user.recovery_token}&type=magiclink&redirect_to=${encodeURIComponent('https://procannedu.com/dashboard')}`;
      
      // Get user profile for personalization
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      // Call our branded email function
      const emailResponse = await supabase.functions.invoke('send-branded-email', {
        body: {
          to: user.email,
          subject: 'Your ProCann Edu Magic Link',
          type: 'magic-link',
          data: {
            firstName: profile?.first_name || user.raw_user_meta_data?.first_name || '',
            magicLink: magicLink
          }
        }
      });

      console.log('Magic link email sent:', emailResponse);
    }
  }
}

serve(handler);