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
    console.log("🔄 Batch Token Regeneration - Starting");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (!authError && user) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (!roles?.some(r => r.role === 'admin')) {
          return new Response(
            JSON.stringify({ success: false, error: 'Admin access required' }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
          );
        }
      }
    }

    // Find all expired tokens
    const { data: expiredApps, error: fetchError } = await supabase
      .from('dispensary_applications')
      .select('*')
      .eq('application_status', 'approved')
      .eq('registration_completed', false)
      .lt('registration_token_expires_at', new Date().toISOString());

    if (fetchError) throw fetchError;

    console.log(`📋 Found ${expiredApps?.length || 0} expired tokens`);

    const results = {
      regenerated: 0,
      failed: 0,
      errors: [] as any[]
    };

    for (const app of expiredApps || []) {
      try {
        console.log(`🔑 Regenerating token for: ${app.organization_name}`);

        // Generate new token directly (RPC may have issues)
        const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

        // Update application with new token
        const { error: updateError } = await supabase
          .from('dispensary_applications')
          .update({
            registration_token: newToken,
            registration_token_expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id);

        if (updateError) {
          console.error(`❌ Failed to update token for ${app.organization_name}:`, updateError);
          results.failed++;
          results.errors.push({
            organization: app.organization_name,
            error: updateError.message
          });
          continue;
        }

        // Queue approval email via notification system
        const registrationUrl = `https://www.procannedu.com/register/manager?token=${newToken}`;
        
        const { error: notifError } = await supabase
          .from('notification_queue')
          .insert({
            recipient_email: app.contact_email,
            subject: 'ProCann Edu - Manager Registration Link',
            message: `Dear ${app.contact_person},\n\nYour organization ${app.organization_name} has been approved!\n\nRegister here: ${registrationUrl}\n\nThis link expires in 30 days.`,
            scheduled_for: new Date().toISOString(),
            priority: 'high',
            metadata: {
              application_id: app.id,
              token_regenerated: true,
              expires_at: expiresAt
            }
          });

        if (notifError) {
          console.error(`⚠️ Failed to queue email for ${app.organization_name}:`, notifError);
        }

        results.regenerated++;
        console.log(`✅ Token regenerated for: ${app.organization_name}`);

      } catch (error: any) {
        console.error(`❌ Error processing ${app.organization_name}:`, error);
        results.failed++;
        results.errors.push({
          organization: app.organization_name,
          error: error.message
        });
      }
    }

    console.log(`✅ Batch regeneration complete: ${results.regenerated} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        total_expired: expiredApps?.length || 0,
        regenerated: results.regenerated,
        failed: results.failed,
        errors: results.errors
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in batch-regenerate-tokens:", error);
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
