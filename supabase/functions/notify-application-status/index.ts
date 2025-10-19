import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { application_id, status, access_key, rejection_reason, applicant_email, organization_name } = await req.json();

    const baseUrl = Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '';

    if (status === 'approved') {
      await resend.emails.send({
        from: "ProCannEdu <noreply@procannedu.com>",
        to: [applicant_email],
        subject: "🎉 Your Dispensary Application Has Been Approved!",
        html: `
          <h1>Congratulations!</h1>
          <p>Your application for ${organization_name} has been approved.</p>
          <p><strong>Access Key:</strong> ${access_key}</p>
          <p><a href="${baseUrl}/auth">Register Now</a></p>
        `,
      });
    } else if (status === 'rejected') {
      await resend.emails.send({
        from: "ProCannEdu <noreply@procannedu.com>",
        to: [applicant_email],
        subject: "Application Status Update - ProCannEdu",
        html: `
          <h1>Application Update</h1>
          <p>Thank you for your application for ${organization_name}.</p>
          <p><strong>Reason:</strong> ${rejection_reason}</p>
          <p><a href="${baseUrl}/org/apply">Reapply</a></p>
        `,
      });
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
