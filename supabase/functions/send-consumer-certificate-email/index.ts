import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { EmailRouter } from "../_shared/email-router.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateEmailRequest {
  email: string;
  name?: string;
  badge_name: string;
  course_title: string;
  certificate_number: string;
  verification_url: string;
  issue_date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      email,
      name,
      badge_name,
      course_title,
      certificate_number,
      verification_url,
      issue_date,
    }: CertificateEmailRequest = await req.json();

    console.log('Sending consumer certificate email to:', email);

    const displayName = name || 'Cannabis Consumer';
    const formattedDate = new Date(issue_date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Certificate - ProCann Edu</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center;">
      <div style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 40px; color: white;">🏆</span>
      </div>
      <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">Congratulations!</h1>
      <p style="margin: 10px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">You've earned your certificate</p>
    </div>

    <!-- Badge Section -->
    <div style="padding: 40px 20px; text-align: center; border-bottom: 2px solid #e5e7eb;">
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 20px; border-radius: 12px; display: inline-block; margin-bottom: 20px;">
        <h2 style="margin: 0; color: #92400e; font-size: 24px; font-weight: bold;">${badge_name}</h2>
      </div>
      <p style="margin: 10px 0 0; color: #6b7280; font-size: 16px;">
        Awarded for completing:<br/>
        <strong style="color: #111827;">${course_title}</strong>
      </p>
    </div>

    <!-- Certificate Details -->
    <div style="padding: 30px 20px;">
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px; color: #111827; font-size: 18px;">Certificate Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Recipient:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${displayName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Certificate Number:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right; font-family: monospace;">${certificate_number}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Issue Date:</td>
            <td style="padding: 8px 0; color: #111827; font-weight: 600; text-align: right;">${formattedDate}</td>
          </tr>
        </table>
      </div>

      <!-- CTA Buttons -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.procannedu.com/consumer-certificates" 
           style="display: inline-block; background-color: #059669; color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 5px;">
          View Your Certificates
        </a>
      </div>

      <!-- Verification Link -->
      <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
        <h4 style="margin: 0 0 10px; color: #1e40af; font-size: 16px;">📋 Share & Verify</h4>
        <p style="margin: 0 0 10px; color: #1e3a8a; font-size: 14px;">
          Anyone can verify your certificate at:
        </p>
        <a href="${verification_url}" 
           style="color: #2563eb; word-break: break-all; font-size: 14px; text-decoration: underline;">
          ${verification_url}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 30px 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">
        <strong>ProCann Edu</strong><br/>
        Maryland's Trusted Cannabis Education Provider
      </p>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">
        No account required • Free consumer education<br/>
        Questions? Contact us at support@procannedu.com
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email using EmailRouter
    const emailRouter = new EmailRouter();
    const emailResult = await emailRouter.sendWithFailover(
      {
        to: email,
        subject: `🏆 You've earned your ${badge_name} certificate!`,
        html: emailHtml,
        from: 'ProCann Edu <certificates@procannedu.com>',
        metadata: {
          certificate_number,
          badge_name,
          course_title,
        }
      },
      supabase
    );

    if (!emailResult.success) {
      console.error('Email send failed:', emailResult.error);
      throw new Error(emailResult.error);
    }

    console.log('Certificate email sent successfully via', emailResult.provider);

    return new Response(
      JSON.stringify({ 
        success: true, 
        provider: emailResult.provider 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error sending consumer certificate email:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
