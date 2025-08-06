import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  type: 'welcome' | 'verification' | 'certificate' | 'password-reset';
  data: Record<string, any>;
}

const getEmailTemplate = (type: string, data: Record<string, any>) => {
  const baseStyle = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
      .container { max-width: 600px; margin: 0 auto; background-color: white; }
      .header { background: linear-gradient(135deg, #059669, #10b981); padding: 40px 20px; text-align: center; }
      .header h1 { color: white; margin: 0; font-size: 28px; font-weight: bold; }
      .header p { color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 16px; }
      .content { padding: 40px 20px; }
      .button { display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
      .footer { background-color: #f1f5f9; padding: 30px 20px; text-align: center; color: #64748b; font-size: 14px; }
      .verification-code { background: #f1f5f9; padding: 20px; border-radius: 8px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; margin: 20px 0; }
      @media (max-width: 600px) { .content { padding: 20px 16px; } .header { padding: 30px 16px; } }
    </style>
  `;

  switch (type) {
    case 'welcome':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Welcome to ProCann Edu!</h1>
            <p>Maryland's Premier Cannabis Training Platform</p>
          </div>
          <div class="content">
            <h2>Welcome ${data.firstName || 'to ProCann Edu'}!</h2>
            <p>Thank you for joining Maryland's leading cannabis education platform. We're excited to help you advance your career in the cannabis industry.</p>
            
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Complete your profile to get personalized course recommendations</li>
              <li>Browse our comprehensive course catalog</li>
              <li>Start earning industry-recognized certificates</li>
            </ul>
            
            <a href="https://procannedu.com/dashboard" class="button">Get Started</a>
            
            <p>If you have any questions, our support team is here to help at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Maryland Cannabis Training Platform<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;
      
    case 'verification':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Verification Required</h1>
            <p>Secure access to your ProCann Edu account</p>
          </div>
          <div class="content">
            <h2>Your verification code</h2>
            <p>Please use the following code to verify your identity:</p>
            
            <div class="verification-code">${data.code}</div>
            
            <p><strong>Security Notice:</strong></p>
            <ul>
              <li>This code expires in 5 minutes</li>
              <li>Only use this code on the ProCann Edu website</li>
              <li>Never share this code with anyone</li>
            </ul>
            
            <p>If you didn't request this code, please ignore this email or contact our support team.</p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Maryland Cannabis Training Platform<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'certificate':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Certificate Ready!</h1>
            <p>Congratulations on your achievement</p>
          </div>
          <div class="content">
            <h2>Your certificate is ready for download</h2>
            <p>Congratulations! You have successfully completed <strong>${data.courseName}</strong> and earned your certificate.</p>
            
            <p><strong>Certificate Details:</strong></p>
            <ul>
              <li>Course: ${data.courseName}</li>
              <li>Completion Date: ${data.completionDate}</li>
              <li>Certificate Number: ${data.certificateNumber}</li>
            </ul>
            
            <a href="https://procannedu.com/certificates" class="button">Download Certificate</a>
            
            <p>Your certificate is now available in your account and can be downloaded or shared with employers.</p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Maryland Cannabis Training Platform<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    default:
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>ProCann Edu</h1>
            <p>Maryland Cannabis Training Platform</p>
          </div>
          <div class="content">
            <p>Thank you for using ProCann Edu!</p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, type, data }: EmailRequest = await req.json();

    if (!to || !subject || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = getEmailTemplate(type, data);

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <no-reply@procannedu.com>",
      to: [to],
      subject,
      html,
    });

    console.log('Branded email sent successfully:', emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in send-branded-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

serve(handler);