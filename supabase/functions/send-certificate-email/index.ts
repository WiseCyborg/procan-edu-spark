
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

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
      issueDate 
    }: CertificateEmailRequest = await req.json();

    console.log("Sending certificate email to:", email);

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <no-reply@procannedu.com>",
      to: [email],
      subject: `Congratulations! Your ${courseTitle} Certificate`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a; font-size: 28px; margin-bottom: 10px;">🎉 Congratulations!</h1>
            <p style="color: #666; font-size: 16px;">You've Successfully Completed Your Training</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); padding: 25px; border-radius: 12px; margin-bottom: 25px; border: 2px solid #16a34a;">
            <h2 style="color: #15803d; margin-bottom: 15px; text-align: center;">Certificate Earned</h2>
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="color: #1f2937; margin-bottom: 10px;">${firstName} ${lastName}</h3>
                <p style="color: #4b5563; font-size: 14px; margin-bottom: 15px;">has successfully completed</p>
                <h4 style="color: #16a34a; font-size: 18px; font-weight: bold; margin-bottom: 15px;">${courseTitle}</h4>
                <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                  <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">Certificate Number</p>
                  <p style="color: #1f2937; font-weight: bold; font-family: monospace;">${certificateNumber}</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">Issue Date: ${issueDate}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1f2937; margin-bottom: 15px;">What This Means</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li style="margin-bottom: 8px;">You are now certified for cannabis operations in Maryland</li>
              <li style="margin-bottom: 8px;">Your certificate is valid through 2025</li>
              <li style="margin-bottom: 8px;">This certification meets MCA requirements</li>
              <li style="margin-bottom: 8px;">You can download your certificate anytime from your dashboard</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://zhmpwczrvitomsxjwpzc.lovableproject.com/dashboard" 
               style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; margin-right: 10px;">
              View Dashboard
            </a>
            <a href="https://zhmpwczrvitomsxjwpzc.lovableproject.com/certificates" 
               style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Download Certificate
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <h4 style="color: #92400e; margin-bottom: 10px;">Important Reminder</h4>
            <p style="color: #78350f; font-size: 14px; line-height: 1.5;">
              Keep your certificate in a safe place and ensure it's accessible during cannabis operations. 
              This certificate demonstrates your compliance with Maryland Cannabis Administration requirements.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
              Questions about your certificate? Contact info@procannedu.com
            </p>
            <p style="color: #9ca3af; font-size: 12px;">
              ProCann Training • In accordance with the Maryland Cannabis Administration
            </p>
          </div>
        </div>
      `,
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
