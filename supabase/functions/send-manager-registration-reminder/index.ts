import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailRouter } from "../_shared/email-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, organizationId, email, days_remaining = 7 } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let recipientEmail: string;
    let recipientName: string;
    let orgName: string;
    let registrationToken: string | null = null;

    if (application_id) {
      // Legacy path: look up from dispensary_applications
      console.log(`📧 Looking up application: ${application_id}`);
      const { data: application } = await supabase
        .from("dispensary_applications")
        .select("*")
        .eq("id", application_id)
        .single();

      if (!application) throw new Error("Application not found");

      recipientEmail = application.contact_email;
      recipientName = application.contact_person;
      orgName = application.organization_name;
      registrationToken = application.registration_token;

    } else if (organizationId) {
      // New path: look up from organizations
      console.log(`📧 Looking up organization: ${organizationId}`);
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .single();

      if (orgError || !org) throw new Error("Organization not found");

      // Get active join code
      const { data: joinCodes } = await supabase
        .from("rvt_join_codes")
        .select("code")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .limit(1);

      const activeCode = joinCodes?.[0]?.code;

      recipientEmail = email;
      recipientName = "Manager";
      orgName = org.name;
      registrationToken = activeCode || null;

      if (!recipientEmail) throw new Error("Manager email is required for organization path");

    } else {
      throw new Error("Either application_id or organizationId is required");
    }

    const templateName = days_remaining <= 3 
      ? "manager-registration-reminder-3day" 
      : "manager-registration-reminder-5day";

    // Build registration URL - use join code for organizations, token for applications
    const registrationUrl = registrationToken 
      ? `https://www.procannedu.com/register/manager?token=${registrationToken}`
      : `https://www.procannedu.com/register/manager`;

    console.log(`📧 Sending reminder to ${recipientEmail} for ${orgName}`);

    const html = await loadEmailTemplate(templateName, {
      ContactPerson: recipientName,
      OrganizationName: orgName,
      DaysRemaining: days_remaining.toString(),
      RegistrationURL: registrationUrl,
    });

    const emailRouter = new EmailRouter();
    const result = await emailRouter.sendWithFailover({
      to: recipientEmail,
      subject: `⏰ Registration Reminder for ${orgName}`,
      html,
      metadata: { email_type: 'manager_registration_reminder' }
    }, supabase);

    await supabase.from("email_logs").insert({
      recipient_email: recipientEmail,
      subject: `⏰ Registration Reminder for ${orgName}`,
      email_type: "manager_registration_reminder",
      status: result.success ? "sent" : "failed",
      metadata: { application_id, organizationId, days_remaining },
    });

    console.log(`✅ Reminder ${result.success ? 'sent' : 'failed'} to ${recipientEmail}`);

    return new Response(JSON.stringify({ success: result.success }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending registration reminder:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
