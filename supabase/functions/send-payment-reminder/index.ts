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
    const { application_id, days_remaining } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: application } = await supabase
      .from("dispensary_applications")
      .select("*")
      .eq("id", application_id)
      .single();

    if (!application) throw new Error("Application not found");

    const templateName = days_remaining <= 3 ? "payment-reminder-3day" : "payment-reminder-7day";
    
    const html = await loadEmailTemplate(templateName, {
      ContactPerson: application.contact_person,
      OrganizationName: application.organization_name,
      DaysRemaining: days_remaining.toString(),
      PaymentURL: `https://www.procannedu.com/payment?token=${application.registration_token}`,
    });

    const emailService = new EmailService();
    const result = await emailService.send({
      to: application.contact_email,
      subject: `⏰ Payment Reminder - ${days_remaining} Days Remaining`,
      html,
    });

    await supabase.from("email_logs").insert({
      recipient_email: application.contact_email,
      subject: `⏰ Payment Reminder - ${days_remaining} Days Remaining`,
      email_type: "payment_reminder",
      status: result.success ? "sent" : "failed",
      metadata: { application_id, days_remaining },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending payment reminder:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
