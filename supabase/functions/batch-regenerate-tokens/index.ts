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

        // Call existing regenerate function
        const { data: regenData, error: regenError } = await supabase.rpc(
          'regenerate_manager_token',
          { application_id: app.id }
        );

        if (regenError) {
          console.error(`❌ Failed to regenerate for ${app.organization_name}:`, regenError);
          results.failed++;
          results.errors.push({
            organization: app.organization_name,
            error: regenError.message
          });
          continue;
        }

        // Send new approval email
        const registrationUrl = `https://www.procannedu.com/manager-registration?token=${regenData.registration_token}`;
        
        const { error: emailError } = await supabase.functions.invoke('send-approval-email', {
          body: {
            contact_email: app.contact_email,
            contact_person: app.contact_person,
            organization_name: app.organization_name,
            access_key: regenData.registration_token,
            registration_url: registrationUrl,
            credits: app.requested_credits || 10
          }
        });

        if (emailError) {
          console.error(`⚠️ Email failed for ${app.organization_name}:`, emailError);
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
