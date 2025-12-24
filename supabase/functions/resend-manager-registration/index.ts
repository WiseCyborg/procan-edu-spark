import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`📧 Resend registration link request for: ${email}`);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // First, check dispensary_applications for this email
    const { data: application } = await supabase
      .from("dispensary_applications")
      .select("id, organization_id, organization_name, contact_email, registration_token, registration_completed")
      .eq("contact_email", email)
      .eq("registration_completed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (application) {
      console.log(`📊 Found pending application for ${email}: ${application.organization_name}`);
      
      // Trigger the reminder with application_id
      const { error: invokeError } = await supabase.functions.invoke('send-manager-registration-reminder', {
        body: { application_id: application.id, days_remaining: 7 }
      });

      if (invokeError) {
        console.error(`❌ Failed to send reminder via application:`, invokeError);
        throw invokeError;
      }

      console.log(`✅ Sent registration reminder via application path`);
      return new Response(JSON.stringify({ success: true, method: 'application' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Second, check organizations where this email is the contact
    const { data: orgs } = await supabase
      .from("organizations")
      .select("id, name, contact_email")
      .eq("contact_email", email)
      .limit(1);

    if (orgs && orgs.length > 0) {
      const org = orgs[0];
      console.log(`📊 Found organization for ${email}: ${org.name}`);

      // Check if there's already a registered manager for this org
      const { data: existingManagers } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("organization_id", org.id)
        .limit(1);

      if (existingManagers && existingManagers.length > 0) {
        console.log(`⚠️ Organization ${org.name} already has a registered manager`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "already_registered",
          message: "This organization already has a registered manager. Please sign in instead."
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Trigger the reminder with organizationId
      const { error: invokeError } = await supabase.functions.invoke('send-manager-registration-reminder', {
        body: { organizationId: org.id, email: email, days_remaining: 7 }
      });

      if (invokeError) {
        console.error(`❌ Failed to send reminder via organization:`, invokeError);
        throw invokeError;
      }

      console.log(`✅ Sent registration reminder via organization path`);
      return new Response(JSON.stringify({ success: true, method: 'organization' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Email not found in either source
    console.log(`⚠️ Email ${email} not found in applications or organizations`);
    
    // Return success anyway to prevent email enumeration attacks
    return new Response(JSON.stringify({ 
      success: true, 
      message: "If your email is registered, you will receive a new link."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Error in resend-manager-registration:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
