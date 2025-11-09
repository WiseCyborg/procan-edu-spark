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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("Checking for escalations...");

    // Check for stuck applications (pending > 48 hours)
    const { data: stuckApplications } = await supabase
      .from("dispensary_applications")
      .select("*, organizations(*)")
      .eq("application_status", "pending")
      .lt("updated_at", new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString());

    if (stuckApplications && stuckApplications.length > 0) {
      console.log(`Found ${stuckApplications.length} stuck applications`);
      
      // Queue admin escalation emails
      for (const app of stuckApplications) {
        await supabase.from("notification_queue").insert({
          recipient_email: "admin@procannedu.com",
          subject: `⚠️ Escalation: Application Pending for ${Math.floor((Date.now() - new Date(app.updated_at).getTime()) / (24 * 60 * 60 * 1000))} days`,
          message: `Application from ${app.organization_name} has been pending review for over 48 hours.`,
          scheduled_for: new Date().toISOString(),
          priority: "high",
          metadata: {
            escalation_type: "stuck_application",
            application_id: app.id,
            hours_pending: Math.floor((Date.now() - new Date(app.updated_at).getTime()) / (60 * 60 * 1000))
          }
        });
      }
    }

    // Check for failed emails (>5 in last hour)
    const { data: failedEmails, count } = await supabase
      .from("email_logs")
      .select("*", { count: "exact" })
      .eq("delivery_status", "failed")
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (count && count > 5) {
      console.log(`Email delivery issues detected: ${count} failures in last hour`);
      
      await supabase.from("notification_queue").insert({
        recipient_email: "admin@procannedu.com",
        subject: `🚨 Email System Alert: ${count} Failures Detected`,
        message: `${count} emails have failed delivery in the last hour. Immediate investigation required.`,
        scheduled_for: new Date().toISOString(),
        priority: "high",
        metadata: {
          escalation_type: "email_failures",
          failure_count: count
        }
      });
    }

    // Check for managers who haven't registered (registration link expires in 24 hours)
    const { data: expiringRegistrations } = await supabase
      .from("dispensary_applications")
      .select("*")
      .eq("application_status", "approved")
      .eq("registration_completed", false)
      .not("registration_token_expires_at", "is", null)
      .gte("registration_token_expires_at", new Date().toISOString())
      .lte("registration_token_expires_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());

    if (expiringRegistrations && expiringRegistrations.length > 0) {
      console.log(`Found ${expiringRegistrations.length} managers with expiring registration links`);
      
      await supabase.from("notification_queue").insert({
        recipient_email: "admin@procannedu.com",
        subject: `⏰ ${expiringRegistrations.length} Manager Registrations Expiring Soon`,
        message: `${expiringRegistrations.length} manager registration links will expire in the next 24 hours.`,
        scheduled_for: new Date().toISOString(),
        priority: "normal",
        metadata: {
          escalation_type: "expiring_registrations",
          count: expiringRegistrations.length
        }
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        escalations_processed: {
          stuck_applications: stuckApplications?.length || 0,
          email_failures: count || 0,
          expiring_registrations: expiringRegistrations?.length || 0
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error checking escalations:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
