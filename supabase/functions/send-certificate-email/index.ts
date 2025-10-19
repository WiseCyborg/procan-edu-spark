
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <certificates@procannedu.com>",
      to: [email],
      subject: `🎓 Your ${courseTitle} Certificate is Ready!`,
      html,
    });

    console.log("Certificate email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
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
