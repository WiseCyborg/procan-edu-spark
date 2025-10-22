
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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CertificateEmailRequest {
  email: string;
  firstName: string;
  lastName: string;
  certificateNumber: string;
  courseTitle: string;
  issueDate: string;
  expiryDate?: string;
  certificateUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      firstName, 
      lastName, 
      certificateNumber, 
      courseTitle, 
      issueDate,
      expiryDate,
      certificateUrl
    }: CertificateEmailRequest = await req.json();

    console.log("Sending certificate email to:", email);

    // Calculate expiry date if not provided (2 years from issue)
    const calculatedExpiryDate = expiryDate || new Date(
      new Date(issueDate).setFullYear(new Date(issueDate).getFullYear() + 2)
    ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Load and render the certificate template
    const html = await loadEmailTemplate('certificate', {
      FirstName: firstName,
      LastName: lastName,
      CertificateNumber: certificateNumber,
      CourseTitle: courseTitle,
      IssueDate: issueDate,
      ExpiryDate: calculatedExpiryDate,
      CertificateURL: certificateUrl || 'https://www.procannedu.com/certificates',
    });

    // Log email attempt
    const { data: logData } = await supabase
      .from('email_logs')
      .insert({
        recipient: email,
        email_type: 'certificate',
        status: 'sending',
        template_name: 'certificate',
        template_data: {
          firstName,
          lastName,
          certificateNumber,
          courseTitle,
        }
      })
      .select('id')
      .single();

    const logId = logData?.id;

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <certificates@procannedu.com>",
      to: [email],
      subject: `🎓 Your ${courseTitle} Certificate is Ready!`,
      html,
    });

    console.log("Certificate email sent successfully:", emailResponse);

    // Update email log
    if (logId) {
      await supabase
        .from('email_logs')
        .update({
          status: emailResponse.data?.id ? 'sent' : 'failed',
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString(),
          error: emailResponse.error ? JSON.stringify(emailResponse.error) : null
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-certificate-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
