
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
  certificationType?: 'rvt' | 'manager';
  trainingTrack?: string;
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
      certificateUrl,
      certificationType,
      trainingTrack
    }: CertificateEmailRequest = await req.json();

    console.log("Processing certificate email for:", email, "- Cert#:", certificateNumber, "- Type:", certificationType);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Calculate expiry date if not provided (2 years from issue)
    const calculatedExpiryDate = expiryDate || new Date(
      new Date(issueDate).setFullYear(new Date(issueDate).getFullYear() + 2)
    ).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Build verification URL - ensure proper formatting
    const baseUrl = 'https://www.procannedu.com';
    const verificationUrl = certificateUrl || `${baseUrl}/verify?code=${certificateNumber}`;
    const certificatesPageUrl = `${baseUrl}/certificates`;

    // Load and render the certificate template
    const html = await loadEmailTemplate('certificate', {
      FirstName: firstName,
      LastName: lastName,
      CertificateNumber: certificateNumber,
      CourseTitle: courseTitle,
      IssueDate: issueDate,
      ExpiryDate: calculatedExpiryDate,
      CertificateURL: verificationUrl,
      CertificatesPageURL: certificatesPageUrl,
      CertificationType: certificationType === 'manager' ? 'Manager' : 'RVT Agent',
      TrainingTrack: trainingTrack || courseTitle,
      BaseURL: baseUrl
    });

    // NOTE: Do NOT pre-insert into email_logs here. EmailRouter.sendWithFailover
    // creates and finalizes the single email_logs row for this send. A duplicate
    // pre-insert would be left stuck in 'sending' and later reaped as 'failed'
    // by the reap-stuck-emails cron, producing phantom failure metrics.

    const router = new EmailRouter();
    const emailResponse = await router.sendWithFailover({
      to: email,
      subject: `🎓 Your ${courseTitle} Certificate is Ready!`,
      html,
      from: "ProCann Edu <certificates@procannedu.com>",
      metadata: {
        email_type: 'certificate',
        template_name: 'certificate',
        firstName,
        lastName,
        certificateNumber,
        courseTitle,
      }
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
