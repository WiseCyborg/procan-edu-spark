import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id, status, access_key, rejection_reason, applicant_email, organization_name } = await req.json();

    const baseUrl = 'https://www.procannedu.com';

    let emailResult;
    let emailType;
    let html;

    if (status === 'approved') {
      emailType = 'application_approved';
      html = await loadEmailTemplate('application-approved', {
        OrganizationName: organization_name,
        AccessKey: access_key,
        RegisterLink: `${baseUrl}/auth`,
      });

      // Log email attempt
      const { data: logData } = await supabase
        .from('email_logs')
        .insert({
          recipient: applicant_email,
          email_type: emailType,
          status: 'sending',
          template_name: 'application-approved',
          template_data: { organization_name, access_key }
        })
        .select('id')
        .single();

      emailResult = await resend.emails.send({
        from: "ProCannEdu <noreply@procannedu.com>",
        to: [applicant_email],
        subject: "🎉 Your Dispensary Application Has Been Approved!",
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
            error: emailResult.error ? JSON.stringify(emailResult.error) : null
          })
          .eq('id', logData.id);
      }
    } else if (status === 'rejected') {
      emailType = 'application_rejected';
      html = await loadEmailTemplate('application-rejected', {
        OrganizationName: organization_name,
        RejectionReason: rejection_reason,
        ReapplyLink: `${baseUrl}/org/apply`,
      });

      // Log email attempt
      const { data: logData } = await supabase
        .from('email_logs')
        .insert({
          recipient: applicant_email,
          email_type: emailType,
          status: 'sending',
          template_name: 'application-rejected',
          template_data: { organization_name, rejection_reason }
        })
        .select('id')
        .single();

      emailResult = await resend.emails.send({
        from: "ProCannEdu <noreply@procannedu.com>",
        to: [applicant_email],
        subject: "Application Status Update - ProCannEdu",
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
            error: emailResult.error ? JSON.stringify(emailResult.error) : null
          })
          .eq('id', logData.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
