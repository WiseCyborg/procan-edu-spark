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
    // Determine the appropriate redirect URL based on environment
    const baseUrl = Deno.env.get('ENVIRONMENT') === 'production' 
      ? 'https://procannedu.com' 
      : 'http://localhost:3000';
    
    const confirmationLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${user.confirmation_token}&type=signup&redirect_to=${encodeURIComponent(`${baseUrl}/dashboard`)}`;
    
    // Try branded email first, fallback to Supabase default if it fails
    try {
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

      if (emailResponse.error) {
        throw new Error(`Branded email failed: ${emailResponse.error.message}`);
      }

      console.log('Branded confirmation email sent successfully:', emailResponse);
    } catch (error) {
      console.log('Branded email failed, using fallback:', error);
      
      // Fallback to Supabase default email
      await supabase.functions.invoke('send-fallback-email', {
        body: {
          type: 'signup',
          email: user.email,
          user_id: user.id,
          confirmation_token: user.confirmation_token,
          redirect_to: `${Deno.env.get('ENVIRONMENT') === 'production' ? 'https://procannedu.com' : 'http://localhost:3000'}/dashboard`
        }
      });
      
      console.log('Fallback confirmation email sent');
    }
  }
}

async function handleUserUpdate(user: any, oldUser: any) {
  console.log('Handling user update:', user.email);
  
  // Handle password reset emails
  if (user.recovery_token && !oldUser?.recovery_token) {
    // Determine the appropriate redirect URL based on environment
    const baseUrl = Deno.env.get('ENVIRONMENT') === 'production' 
      ? 'https://procannedu.com' 
      : 'http://localhost:3000';
    
    const resetLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${user.recovery_token}&type=recovery&redirect_to=${encodeURIComponent(`${baseUrl}/auth?mode=reset`)}`;
    
    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();
    
    // Try branded email first, fallback to Supabase default if it fails
    try {
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

      if (emailResponse.error) {
        throw new Error(`Branded email failed: ${emailResponse.error.message}`);
      }

      console.log('Branded password reset email sent successfully:', emailResponse);
    } catch (error) {
      console.log('Branded email failed, using fallback:', error);
      
      // Fallback to Supabase default email
      await supabase.functions.invoke('send-fallback-email', {
        body: {
          type: 'recovery',
          email: user.email,
          user_id: user.id,
          recovery_token: user.recovery_token,
          redirect_to: `${Deno.env.get('ENVIRONMENT') === 'production' ? 'https://procannedu.com' : 'http://localhost:3000'}/auth?mode=reset`
        }
      });
      
      console.log('Fallback password reset email sent');
    }
  }

  // Handle magic link emails
  if (user.recovery_token && user.recovery_sent_at && !oldUser?.recovery_sent_at) {
    // Check if this is a magic link request (not password reset)
    const timeDiff = new Date(user.recovery_sent_at).getTime() - new Date(user.updated_at).getTime();
    
    if (Math.abs(timeDiff) < 5000) { // Within 5 seconds, likely magic link
      // Determine the appropriate redirect URL based on environment
      const baseUrl = Deno.env.get('ENVIRONMENT') === 'production' 
        ? 'https://procannedu.com' 
        : 'http://localhost:3000';
      
      const magicLink = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${user.recovery_token}&type=magiclink&redirect_to=${encodeURIComponent(`${baseUrl}/dashboard`)}`;
      
      // Get user profile for personalization
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .single();
      
      // Try branded email first, fallback to Supabase default if it fails
      try {
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

        if (emailResponse.error) {
          throw new Error(`Branded email failed: ${emailResponse.error.message}`);
        }

        console.log('Branded magic link email sent successfully:', emailResponse);
      } catch (error) {
        console.log('Branded email failed, using fallback:', error);
        
        // Fallback to Supabase default email
        await supabase.functions.invoke('send-fallback-email', {
          body: {
            type: 'magiclink',
            email: user.email,
            user_id: user.id,
            recovery_token: user.recovery_token,
            redirect_to: `${Deno.env.get('ENVIRONMENT') === 'production' ? 'https://procannedu.com' : 'http://localhost:3000'}/dashboard`
          }
        });
        
        console.log('Fallback magic link email sent');
      }
    }
  }
}

serve(handler);