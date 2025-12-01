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

    // Use web-push library (requires VAPID keys)
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@procannedu.com';

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

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
        // Create JWT for VAPID
        const jwtHeader = btoa(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
        const jwtPayload = btoa(JSON.stringify({
          aud: new URL(sub.endpoint).origin,
          exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
          sub: vapidSubject
        }));

        // Send push notification via Web Push Protocol
        const response = await fetch(sub.endpoint, {
          method: 'POST',
          headers: {
            'TTL': '86400',
            'Content-Type': 'application/octet-stream',
            'Content-Encoding': 'aes128gcm',
          },
          body: payload
        });

        if (response.ok) {
          sent++;
          console.log('[Push] Notification sent successfully');
        } else {
          failed++;
          failedSubscriptionIds.push(sub.id);
          console.error('[Push] Failed to send:', response.status, await response.text());
        }
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
