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

    console.log("🔍 Fetching approved applications with valid registration tokens...");

    // Get all approved applications with valid, unexpired tokens
    const { data: applications, error: fetchError } = await supabase
      .from("dispensary_applications")
      .select("*")
      .eq("application_status", "approved")
      .not("registration_token", "is", null)
      .gt("registration_token_expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (fetchError) {
      throw new Error(`Failed to fetch applications: ${fetchError.message}`);
    }

    if (!applications || applications.length === 0) {
      console.log("ℹ️ No approved applications with valid tokens found");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No applications require reminders",
          sent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`📧 Found ${applications.length} applications. Sending reminders...`);

    const results = [];

    for (const application of applications) {
      try {
        // Calculate days remaining until token expiry
        const expiryDate = new Date(application.registration_token_expires_at);
        const now = new Date();
        const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        console.log(`📤 Sending reminder to ${application.contact_email} (${daysRemaining} days remaining)`);

        // Call the existing send-manager-registration-reminder function
        const { data: reminderResult, error: reminderError } = await supabase.functions.invoke(
          "send-manager-registration-reminder",
          {
            body: {
              application_id: application.id,
              days_remaining: daysRemaining,
            },
          }
        );

        if (reminderError) {
          console.error(`❌ Failed to send reminder to ${application.contact_email}:`, reminderError);
          results.push({
            email: application.contact_email,
            organization: application.organization_name,
            success: false,
            error: reminderError.message,
          });
        } else {
          console.log(`✅ Reminder sent to ${application.contact_email}`);
          results.push({
            email: application.contact_email,
            organization: application.organization_name,
            success: true,
            days_remaining: daysRemaining,
          });
        }
      } catch (error: any) {
        console.error(`❌ Error processing ${application.contact_email}:`, error);
        results.push({
          email: application.contact_email,
          organization: application.organization_name,
          success: false,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    console.log(`📊 Summary: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} reminders, ${failureCount} failed`,
        sent: successCount,
        failed: failureCount,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("❌ Fatal error in send-all-manager-reminders:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
