import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, callTitle, callUrl } = await req.json();

    console.log('[CallReminder] Sending reminder:', { userId, callTitle });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('first_name, email_cache')
      .eq('user_id', userId)
      .single();

    if (!profile) {
      throw new Error('User profile not found');
    }

    // Send push notification
    try {
      await supabaseAdmin.functions.invoke('send-push-notification', {
        body: {
          userId,
          title: 'Video Call Starting Soon',
          body: `${callTitle} is starting in 5 minutes`,
          url: callUrl,
          tag: `call-reminder-${userId}`
        }
      });
    } catch (err) {
      console.error('[CallReminder] Push notification failed:', err);
    }

    // TODO: Send email reminder as fallback
    // For now, just log
    console.log('[CallReminder] Reminder sent successfully');

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[CallReminder] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
