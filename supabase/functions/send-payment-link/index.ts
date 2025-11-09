import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get application details
    const { data: app, error: appError } = await supabase
      .from('dispensary_applications')
      .select('*')
      .eq('id', application_id)
      .single();

    if (appError || !app) throw new Error('Application not found');

    // Calculate payment deadline (30 days from now)
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);

    const html = await loadEmailTemplate('payment-link', {
      ContactPerson: app.contact_person,
      OrganizationName: app.organization_name,
      TotalAmount: (app.requested_credits * 50).toString(), // $50 per credit
      Credits: app.requested_credits.toString(),
      PaymentUrl: `https://www.procannedu.com/payment/${application_id}`,
      PaymentDeadline: deadline.toLocaleDateString(),
    });

    // Log email attempt
    const { data: logData } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: app.contact_email,
        subject: 'Complete Your Payment - ProCann Edu RVT Program',
        email_type: 'payment_link',
        status: 'sending',
        template_name: 'payment-link',
      })
      .select('id')
      .single();

    const emailResult = await resend.emails.send({
      from: "ProCann Edu <billing@procannedu.com>",
      to: [app.contact_email],
      subject: "Complete Your Payment - ProCann Edu RVT Program",
      html,
    });

    // Update log
    if (logData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: emailResult.data?.id ? 'sent' : 'failed',
          provider_id: emailResult.data?.id,
          sent_at: new Date().toISOString(),
          error_message: emailResult.error ? JSON.stringify(emailResult.error) : null,
        })
        .eq('id', logData.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});