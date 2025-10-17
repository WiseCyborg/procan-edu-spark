
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #F9F7EE;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #2A7F3F 0%, #FFB300 50%, #C62828 100%); width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 56px;">🎓</span>
            </div>
            <h1 style="color: #C62828; font-size: 32px; margin-bottom: 10px; font-weight: bold;">🔴 Achievement Unlocked!</h1>
            <p style="color: #1E1E1E; font-size: 16px;">You've mastered the Stoplight Standard™</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #C62828;">
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="display: inline-block; background: #C62828; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 15px;">
                🔴 RED TIER CERTIFIED
              </div>
            </div>
            <h2 style="color: #1E1E1E; margin-bottom: 15px; text-align: center; font-size: 22px;">Official Certificate of Completion</h2>
            <div style="text-align: center; margin-bottom: 20px;">
              <div style="background: #f8fafc; padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="color: #1E1E1E; margin-bottom: 10px; font-size: 20px;">${firstName} ${lastName}</h3>
                <p style="color: #4b5563; font-size: 14px; margin-bottom: 15px;">has successfully completed</p>
                <h4 style="color: #2A7F3F; font-size: 18px; font-weight: bold; margin-bottom: 15px;">${courseTitle}</h4>
                <p style="color: #4b5563; font-size: 14px; margin-bottom: 15px;">including mastery of the <strong>Stoplight Standard™</strong> three-tier dosage system</p>
                <div style="border-top: 2px solid #e5e7eb; padding-top: 15px;">
                  <p style="color: #6b7280; font-size: 12px; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.5px;">Certificate Number</p>
                  <p style="color: #1E1E1E; font-weight: bold; font-family: monospace; font-size: 16px;">${certificateNumber}</p>
                  <p style="color: #6b7280; font-size: 12px; margin-top: 10px;">Issue Date: ${issueDate}</p>
                  <p style="color: #6b7280; font-size: 12px;">Valid through: ${new Date(new Date(issueDate).setFullYear(new Date(issueDate).getFullYear() + 2)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div style="background: linear-gradient(135deg, #2A7F3F 0%, #FFB300 50%, #C62828 100%); padding: 3px; border-radius: 12px; margin-bottom: 25px;">
            <div style="background: white; padding: 25px; border-radius: 10px;">
              <h3 style="color: #1E1E1E; margin-bottom: 15px;">🚦 Your Stoplight Standard™ Mastery</h3>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 15px;">
                You've demonstrated comprehensive knowledge of all three tiers:
              </p>
              <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px; margin: 0;">
                <li><strong style="color: #2A7F3F;">🟢 Green Tier:</strong> Beginner-friendly products (5mg THC or less)</li>
                <li><strong style="color: #FFB300;">🟡 Yellow Tier:</strong> Intermediate experiences (5-10mg THC)</li>
                <li><strong style="color: #C62828;">🔴 Red Tier:</strong> Advanced consumer products (10mg+ THC)</li>
              </ul>
            </div>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #1E1E1E; margin-bottom: 15px;">What This Certification Means</h3>
            <ul style="color: #4b5563; line-height: 1.8; padding-left: 20px;">
              <li style="margin-bottom: 8px;">✅ You are now certified for cannabis operations in Maryland</li>
              <li style="margin-bottom: 8px;">✅ Your certificate is valid for 2 years</li>
              <li style="margin-bottom: 8px;">✅ This certification meets MCA requirements</li>
              <li style="margin-bottom: 8px;">✅ Download your certificate anytime from your dashboard</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://zhmpwczrvitomsxjwpzc.lovableproject.com/certificates" 
               style="background: #C62828; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin-right: 10px; font-size: 16px;">
              Download Certificate
            </a>
            <a href="https://zhmpwczrvitomsxjwpzc.lovableproject.com/dashboard" 
               style="background: #2A7F3F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">
              View Dashboard
            </a>
          </div>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #FFB300;">
            <h4 style="color: #92400e; margin-bottom: 10px;">📋 Important Certificate Guidelines</h4>
            <p style="color: #78350f; font-size: 14px; line-height: 1.5; margin: 0;">
              Keep your certificate accessible during all cannabis operations. This certification demonstrates 
              your compliance with Maryland Cannabis Administration requirements and your expertise in the 
              Stoplight Standard™ responsible dosage system.
            </p>
          </div>
          
          <div style="border-top: 2px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #1E1E1E; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              The Heartbeat of Responsible Cannabis Education in Maryland
            </p>
            <p style="color: #9ca3af; font-size: 14px; margin-bottom: 10px;">
              Questions about your certificate? Contact info@procannedu.com
            </p>
            <p style="color: #9ca3af; font-size: 12px;">
              ProCann Edu • In accordance with the Maryland Cannabis Administration
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
