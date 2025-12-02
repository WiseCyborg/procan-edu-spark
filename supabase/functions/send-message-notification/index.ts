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
    const { conversationId, senderId, senderName, messagePreview, conversationTitle } = await req.json();

    console.log('[Message Notification] Processing:', { conversationId, senderId });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get conversation participants (excluding sender)
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId);

    if (participantsError) {
      console.error('[Message Notification] Error fetching participants:', participantsError);
      throw participantsError;
    }

    if (!participants || participants.length === 0) {
      console.log('[Message Notification] No participants to notify');
      return new Response(JSON.stringify({ notified: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Send push notification to each participant
    let notified = 0;
    const notificationPromises = participants.map(async (participant) => {
      try {
        const { error } = await supabaseAdmin.functions.invoke('send-push-notification', {
          body: {
            userId: participant.user_id,
            title: `${senderName} in ${conversationTitle}`,
            body: messagePreview.substring(0, 100),
            url: `/messages?conversation=${conversationId}`,
            tag: `message-${conversationId}`,
          }
        });

        if (!error) {
          notified++;
          console.log('[Message Notification] Sent to user:', participant.user_id);
        } else {
          console.error('[Message Notification] Failed for user:', participant.user_id, error);
        }
      } catch (error) {
        console.error('[Message Notification] Exception for user:', participant.user_id, error);
      }
    });

    await Promise.allSettled(notificationPromises);

    console.log('[Message Notification] Notified:', notified, 'participants');

    return new Response(JSON.stringify({ notified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Message Notification] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
