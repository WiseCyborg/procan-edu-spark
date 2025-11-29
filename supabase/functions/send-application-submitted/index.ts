import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailService } from "../_shared/email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get application details
    const { data: application, error: appError } = await supabase
      .from("dispensary_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (appError || !application) {
      throw new Error("Application not found");
    }

    // Load email template
    const html = await loadEmailTemplate("application-submitted", {
      ContactPerson: application.contact_person,
      OrganizationName: application.organization_name,
      ApplicationId: application_id,
      LicenseNumber: application.license_number || "Not Provided",
      ContactEmail: application.contact_email,
      SubmittedAt: new Date(application.created_at).toLocaleString(),
    });

    // Send email
    const emailService = new EmailService();
    const result = await emailService.send({
      to: application.contact_email,
      subject: "Application Received - ProCann Edu RVT Program",
      html,
    });

    // Log email
    await supabase.from("email_logs").insert({
      recipient_email: application.contact_email,
      subject: "Application Received - ProCann Edu RVT Program",
      email_type: "application_submitted",
      status: result.success ? "sent" : "failed",
      metadata: { application_id },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending application confirmation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
