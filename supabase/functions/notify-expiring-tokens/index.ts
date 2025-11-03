import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("⏰ Notify Expiring Tokens - Starting");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    // Find tokens expiring in 2 days
    const { data: expiringSoon, error: expiringSoonError } = await supabase
      .from('dispensary_applications')
      .select('*')
      .eq('application_status', 'approved')
      .eq('registration_completed', false)
      .gte('registration_token_expires_at', now.toISOString())
      .lte('registration_token_expires_at', twoDaysFromNow.toISOString());

    if (expiringSoonError) throw expiringSoonError;

    console.log(`📋 Found ${expiringSoon?.length || 0} tokens expiring soon`);

    // Find expired tokens
    const { data: expired, error: expiredError } = await supabase
      .from('dispensary_applications')
      .select('*')
      .eq('application_status', 'approved')
      .eq('registration_completed', false)
      .lt('registration_token_expires_at', now.toISOString());

    if (expiredError) throw expiredError;

    console.log(`🚨 Found ${expired?.length || 0} expired tokens`);

    const notifications = [];

    // Send reminder emails for expiring tokens
    for (const app of expiringSoon || []) {
      console.log(`📧 Sending reminder to ${app.contact_email}`);
      
      // TODO: Send reminder email via edge function
      // await supabase.functions.invoke('send-token-expiry-reminder', {
      //   body: {
      //     contact_email: app.contact_email,
      //     contact_person: app.contact_person,
      //     organization_name: app.organization_name,
      //     expires_at: app.registration_token_expires_at
      //   }
      // });

      notifications.push({
        notification_type: 'token_expiring_soon',
        priority: 'medium',
        title: `Registration Token Expiring Soon: ${app.organization_name}`,
        message: `Manager registration token for ${app.organization_name} expires in 2 days`,
        target_users: ['admin'],
        action_url: `/admin/operations?tab=pipeline`,
        metadata: {
          application_id: app.id,
          organization_name: app.organization_name,
          expires_at: app.registration_token_expires_at
        }
      });
    }

    // Alert admins about expired tokens
    for (const app of expired || []) {
      console.log(`🚨 Expired token for ${app.organization_name}`);
      
      notifications.push({
        notification_type: 'token_expired',
        priority: 'high',
        title: `Registration Token Expired: ${app.organization_name}`,
        message: `Manager ${app.contact_person} never registered. Token expired. Action required.`,
        target_users: ['admin'],
        action_url: `/admin/operations?tab=pipeline`,
        metadata: {
          application_id: app.id,
          organization_name: app.organization_name,
          contact_email: app.contact_email,
          expired_at: app.registration_token_expires_at
        }
      });
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: notifError } = await supabase
        .from('notification_queue')
        .insert(notifications);

      if (notifError) {
        console.error("Failed to create notifications:", notifError);
      }
    }

    console.log(`✅ Created ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiring_soon: expiringSoon?.length || 0,
        expired: expired?.length || 0,
        notifications_sent: notifications.length
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in notify-expiring-tokens:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
