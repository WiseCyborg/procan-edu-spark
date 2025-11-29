
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailRouter } from "../_shared/email-router.ts";

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
  console.log('=== Certificate Email Handler Started ===');
  console.log('RESEND_API_KEY configured:', !!Deno.env.get("RESEND_API_KEY"));
  
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

    console.log("Processing certificate email for:", email, "- Cert#:", certificateNumber);

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
        recipient_email: email,
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

    const router = new EmailRouter();
    const emailResponse = await router.sendWithFailover({
      to: email,
      subject: `🎓 Your ${courseTitle} Certificate is Ready!`,
      html,
      from: "ProCann Edu <certificates@procannedu.com>",
      metadata: { email_type: 'certificate', log_id: logId }
    }, supabase);

    console.log("Certificate email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: emailResponse.success, 
      emailId: emailResponse.providerId,
      provider: emailResponse.provider
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
