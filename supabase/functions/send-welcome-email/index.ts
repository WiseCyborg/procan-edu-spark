
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Initialize Supabase client for logging
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  lastName?: string;
  tempPassword?: string;
  organizationName?: string;
  accessKey?: string;
  loginUrl?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log('=== Welcome Email Handler Started ===');
  console.log('RESEND_API_KEY configured:', !!Deno.env.get("RESEND_API_KEY"));
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, firstName, lastName, tempPassword, organizationName, accessKey, loginUrl }: WelcomeEmailRequest = await req.json();
    console.log(`Processing welcome email for: ${email}`);
    
    // Check if welcome email was already sent in the last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    
    const { data: existingLogs, error: checkError } = await supabase
      .from('email_logs')
      .select('id')
      .eq('recipient_email', email)
      .eq('email_type', 'welcome')
      .eq('status', 'sent')
      .gte('sent_at', oneDayAgo)
      .limit(1)

    if (checkError) {
      console.error('Error checking email logs:', checkError)
    }

    if (existingLogs && existingLogs.length > 0) {
      console.log(`Welcome email already sent to ${email} in the last 24 hours, skipping`)
      return new Response(JSON.stringify({ 
        message: 'Welcome email already sent recently',
        skipped: true 
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      });
    }

    console.log("Sending welcome email to:", email);

    // Prepare email subject and HTML based on whether this is auto-enrollment or regular welcome
    const isAutoEnrollment = !!tempPassword;
    const subject = isAutoEnrollment 
      ? "Welcome to ProCann Edu - Your Account is Ready!" 
      : "Welcome to ProCann Edu - Your Cannabis Training Journey Begins!";

    // Log email attempt
    const { data: logData, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: email,
        email_type: 'welcome',
        status: 'sending',
        subject: subject
      })
      .select('id')
      .single()

    let html: string;
    
    if (isAutoEnrollment) {
      // Custom HTML for auto-enrolled dispensary managers
      html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ProCann Edu</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #4a4a4a; }
    .credentials { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; }
    .credentials h3 { margin-top: 0; color: #16a34a; }
    .button { display: inline-block; background: #16a34a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .important { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to ProCann Edu!</h1>
    </div>
    <div class="content">
      <h2>Hello ${firstName}!</h2>
      <p>Great news! Your organization <strong>${organizationName || 'your organization'}</strong> has been approved for the Responsible Vendor Training (RVT) program.</p>
      <p>We've automatically created your account so you can get started right away!</p>
      
      <div class="credentials">
        <h3>🔐 Your Login Credentials</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${tempPassword}</code></p>
        ${accessKey ? `<p><strong>Organization Access Key:</strong> <code style="background: #e5e7eb; padding: 4px 8px; border-radius: 4px;">${accessKey}</code></p>` : ''}
      </div>

      <div class="important">
        <strong>⚠️ Important:</strong> Please change your password immediately after your first login for security purposes.
      </div>

      <a href="${loginUrl || 'https://www.procannedu.com/auth'}" class="button">Login to Your Account</a>

      <h3>What's Next?</h3>
      <ul>
        <li>Complete your profile setup</li>
        <li>Review your organization's training dashboard</li>
        <li>Invite employees to join your training program</li>
        <li>Track team progress and certifications</li>
      </ul>

      <p>If you have any questions or need assistance, our support team is here to help!</p>
      
      <p>Best regards,<br>The ProCann Edu Team</p>
    </div>
    <div class="footer">
      <p>© 2025 ProCann Edu. All rights reserved.</p>
      <p>This email was sent to ${email}</p>
    </div>
  </div>
</body>
</html>
      `;
    } else {
      // Load standard welcome template
      html = await loadEmailTemplate('welcome', {
        FirstName: firstName,
        DashboardURL: 'https://www.procannedu.com/dashboard',
      });
    }

    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <noreply@procannedu.com>",
      to: [email],
      subject: subject,
      html,
    });

    // Update email log with success/failure
    if (logData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: emailResponse.data?.id ? 'sent' : 'failed',
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString(),
          error: emailResponse.error ? JSON.stringify(emailResponse.error) : null
        })
        .eq('id', logData.id)
    }

    console.log("Welcome email sent successfully:", emailResponse);

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
    console.error("Error in send-welcome-email function:", error);
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
