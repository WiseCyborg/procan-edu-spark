import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.6";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, url, tag } = await req.json();

    console.log('[Push] Sending notification:', { userId, title });

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user's active push subscriptions
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[Push] No active subscriptions for user');
      return new Response(JSON.stringify({ sent: 0, failed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Configure VAPID details
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:info@procannedu.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: title || 'ProCann Edu',
      body: body || 'You have a new notification',
      url: url || '/',
      tag: tag || 'default',
      icon: '/logo192.png',
      badge: '/badge.png'
    });

    let sent = 0;
    let failed = 0;
    const failedSubscriptionIds: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh_key,
            auth: sub.auth_key
          }
        };

        await webpush.sendNotification(pushSubscription, payload);
        sent++;
        console.log('[Push] Notification sent successfully to:', sub.endpoint.substring(0, 50));
      } catch (error) {
        failed++;
        failedSubscriptionIds.push(sub.id);
        console.error('[Push] Error sending to subscription:', error);
      }
    }

    // Mark failed subscriptions as inactive
    if (failedSubscriptionIds.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('id', failedSubscriptionIds);
    }

    console.log('[Push] Results:', { sent, failed });

    return new Response(JSON.stringify({ sent, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[Push] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
