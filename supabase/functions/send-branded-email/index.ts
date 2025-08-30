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
  type: 'welcome' | 'verification' | 'certificate' | 'password-reset' | 'email-confirmation' | 'magic-link' | 'dispensary-welcome' | 'dispensary-payment-confirmation' | 'dispensary-setup-complete' | 'student-invitation' | 'student-welcome-with-dispensary';
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
            <p>${data.dispensaryName ? `Training Sponsored by ${data.dispensaryName}` : 'Maryland\'s Premier Cannabis Training Platform'}</p>
          </div>
          <div class="content">
            <h2>Welcome ${data.firstName || 'to ProCann Edu'}!</h2>
            <p>Thank you for joining Maryland's leading cannabis education platform. ${data.dispensaryName ? `Your training is proudly sponsored by <strong>${data.dispensaryName}</strong>.` : 'We\'re excited to help you advance your career in the cannabis industry.'}</p>
            
            <p><strong>What's next?</strong></p>
            <ul>
              <li>Complete your profile to get ${data.dispensaryName ? 'started with your sponsored training' : 'personalized course recommendations'}</li>
              <li>${data.dispensaryName ? 'Access your sponsored training modules' : 'Browse our comprehensive course catalog'}</li>
              <li>Start earning industry-recognized certificates</li>
              ${data.dispensaryName ? `<li>Your progress is tracked for ${data.dispensaryName}</li>` : ''}
            </ul>
            
            <a href="https://procannedu.com/dashboard" class="button">Get Started</a>
            
            <p>If you have any questions, our support team is here to help at <a href="mailto:support@procannedu.com">support@procannedu.com</a>${data.dispensaryName ? `. For workplace questions, reach out to your manager at ${data.dispensaryName}` : ''}.</p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            ${data.dispensaryName ? `Training sponsored by ${data.dispensaryName}` : 'Maryland Cannabis Training Platform'}<br>
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
            ${data.dispensaryName ? `<p><strong>Training sponsored by:</strong> ${data.dispensaryName}</p>` : ''}
            
            <p><strong>Certificate Details:</strong></p>
            <ul>
              <li>Course: ${data.courseName}</li>
              <li>Completion Date: ${data.completionDate}</li>
              <li>Certificate Number: ${data.certificateNumber}</li>
              ${data.dispensaryName ? `<li>Sponsored by: ${data.dispensaryName}</li>` : ''}
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

    case 'dispensary-welcome':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Welcome to ProCann Edu Partners!</h1>
            <p>Dispensary Training Partnership Program</p>
          </div>
          <div class="content">
            <h2>Welcome ${data.dispensaryName || data.contactPerson}!</h2>
            <p>Thank you for joining ProCann Edu's Dispensary Partnership Program. We're excited to help you train your entire team with Maryland's leading cannabis education platform.</p>
            
            <p><strong>Your Partnership Benefits:</strong></p>
            <ul>
              <li>Bulk training for all your employees</li>
              <li>Dedicated dispensary management dashboard</li>
              <li>Employee progress tracking and reporting</li>
              <li>Industry-recognized certificates for your team</li>
              <li>Maryland compliance training standards</li>
            </ul>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Complete your payment to activate your account</li>
              <li>Receive your unique dispensary access key</li>
              <li>Share the key with your employees for registration</li>
              <li>Monitor progress through your management dashboard</li>
            </ol>
            
            <a href="https://procannedu.com/dispensary-setup" class="button">Complete Setup</a>
            
            <p>If you have any questions, our dedicated dispensary support team is here to help at <a href="mailto:dispensary-support@procannedu.com">dispensary-support@procannedu.com</a></p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Dispensary Partnership Program<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'dispensary-payment-confirmation':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Payment Confirmed!</h1>
            <p>Your Dispensary Training Account is Active</p>
          </div>
          <div class="content">
            <h2>Welcome to ProCann Edu, ${data.dispensaryName}!</h2>
            <p>Your payment has been processed successfully and your dispensary training account is now active.</p>
            
            <div class="verification-code">${data.dispensaryKey}</div>
            <p style="text-align: center; margin-top: 10px;"><strong>Your Unique Dispensary Access Key</strong></p>
            
            <p><strong>Important Instructions:</strong></p>
            <ul>
              <li>Share this key with all employees who need training</li>
              <li>Employees will use this key during registration</li>
              <li>Keep this key secure - it provides access to your training program</li>
              <li>This key never expires and can be reused for new employees</li>
            </ul>
            
            <p><strong>Account Details:</strong></p>
            <ul>
              <li>Dispensary: ${data.dispensaryName}</li>
              <li>Training Licenses: ${data.trainingLicenses || 'Unlimited'}</li>
              <li>Payment Amount: $${data.amount}</li>
              <li>Transaction ID: ${data.transactionId}</li>
            </ul>
            
            <a href="https://procannedu.com/dispensary-dashboard" class="button">Access Dashboard</a>
            
            <p>Your employees can now register at <a href="https://procannedu.com">procannedu.com</a> using your dispensary key.</p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Dispensary Partnership Program<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'dispensary-setup-complete':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Setup Complete!</h1>
            <p>Your Dispensary Training Program is Ready</p>
          </div>
          <div class="content">
            <h2>Congratulations, ${data.dispensaryName}!</h2>
            <p>Your dispensary training program setup is complete. You can now manage employee training and track progress through your dedicated dashboard.</p>
            
            <p><strong>Your Dispensary Key:</strong></p>
            <div class="verification-code">${data.dispensaryKey}</div>
            
            <p><strong>How to Invite Employees:</strong></p>
            <ol>
              <li>Share your dispensary key with employees</li>
              <li>Direct them to register at <a href="https://procannedu.com">procannedu.com</a></li>
              <li>They'll enter your key during the registration process</li>
              <li>Monitor their progress through your dashboard</li>
            </ol>
            
            <p><strong>Management Features:</strong></p>
            <ul>
              <li>Employee progress tracking</li>
              <li>Completion reports and analytics</li>
              <li>Certificate downloads for your team</li>
              <li>Compliance reporting for Maryland regulations</li>
            </ul>
            
            <a href="https://procannedu.com/dispensary-dashboard" class="button">Access Dashboard</a>
            
            <p>For ongoing support, contact our dispensary team at <a href="mailto:dispensary-support@procannedu.com">dispensary-support@procannedu.com</a></p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Dispensary Partnership Program<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'student-invitation':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Training Invitation</h1>
            <p>Your Cannabis Education Journey Starts Here</p>
          </div>
          <div class="content">
            <h2>Hello ${data.employeeName || 'Team Member'}!</h2>
            <p>You've been invited by <strong>${data.dispensaryName}</strong> to complete cannabis training through ProCann Edu, Maryland's premier cannabis education platform.</p>
            
            <p><strong>Your Training is Sponsored by:</strong> ${data.dispensaryName}</p>
            
            <div class="verification-code">${data.dispensaryKey}</div>
            <p style="text-align: center; margin-top: 10px;"><strong>Your Registration Key</strong></p>
            
            <p><strong>Getting Started:</strong></p>
            <ol>
              <li>Visit <a href="https://procannedu.com">ProCann Edu</a></li>
              <li>Click "Student Registration"</li>
              <li>Enter the key above when prompted</li>
              <li>Complete your profile and start training</li>
            </ol>
            
            <p><strong>What You'll Learn:</strong></p>
            <ul>
              <li>Maryland cannabis regulations and compliance</li>
              <li>Product knowledge and safety protocols</li>
              <li>Customer service best practices</li>
              <li>Industry standards and certifications</li>
            </ul>
            
            <a href="https://procannedu.com" class="button">Start Training</a>
            
            <p>Questions? Contact your manager at ${data.dispensaryName} or our support team at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Training sponsored by ${data.dispensaryName}<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'student-welcome-with-dispensary':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Welcome to ProCann Edu!</h1>
            <p>Training Sponsored by ${data.dispensaryName}</p>
          </div>
          <div class="content">
            <h2>Welcome ${data.firstName || 'to ProCann Edu'}!</h2>
            <p>Thank you for joining Maryland's leading cannabis education platform. Your training is proudly sponsored by <strong>${data.dispensaryName}</strong>.</p>
            
            <p><strong>Your Training Journey:</strong></p>
            <ul>
              <li>Complete your profile to get started</li>
              <li>Access comprehensive cannabis education modules</li>
              <li>Earn industry-recognized certificates</li>
              <li>Your progress is tracked for ${data.dispensaryName}</li>
            </ul>
            
            <p><strong>Sponsored Training Benefits:</strong></p>
            <ul>
              <li>Full course access at no cost to you</li>
              <li>Support from both ProCann Edu and ${data.dispensaryName}</li>
              <li>Certificates that advance your cannabis career</li>
              <li>Maryland compliance training standards</li>
            </ul>
            
            <a href="https://procannedu.com/dashboard" class="button">Start Learning</a>
            
            <p>For training questions, contact <a href="mailto:support@procannedu.com">support@procannedu.com</a>. For workplace questions, reach out to your manager at ${data.dispensaryName}.</p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Training sponsored by ${data.dispensaryName}<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'password-reset':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
            <p>Secure access to your ProCann Edu account</p>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hi ${data.firstName || 'there'},</p>
            <p>We received a request to reset the password for your ProCann Edu account. Click the button below to create a new password:</p>
            
            <a href="${data.resetLink}" class="button">Reset Password</a>
            
            <p><strong>Security Information:</strong></p>
            <ul>
              <li>This link expires in 1 hour for your security</li>
              <li>Only use this link on the official ProCann Edu website</li>
              <li>If you didn't request this reset, you can safely ignore this email</li>
              <li>Your current password remains unchanged until you create a new one</li>
            </ul>
            
            <p>If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.resetLink}" style="color: #059669; word-break: break-all;">${data.resetLink}</a></p>
            
            <p>For security questions or support, contact us at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Maryland Cannabis Training Platform<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'email-confirmation':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Confirm Your Email</h1>
            <p>Complete your ProCann Edu registration</p>
          </div>
          <div class="content">
            <h2>Welcome to ProCann Edu!</h2>
            <p>Hi ${data.firstName || 'there'},</p>
            <p>Thank you for registering with ProCann Edu. To complete your account setup and start your cannabis education journey, please confirm your email address:</p>
            
            <a href="${data.confirmationLink}" class="button">Confirm Email Address</a>
            
            <p><strong>What happens next?</strong></p>
            <ul>
              <li>Confirm your email to activate your account</li>
              <li>Complete your profile for personalized recommendations</li>
              <li>Start accessing our comprehensive course catalog</li>
              <li>Begin earning industry-recognized certificates</li>
            </ul>
            
            <p>If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.confirmationLink}" style="color: #059669; word-break: break-all;">${data.confirmationLink}</a></p>
            
            <p><strong>Security Notice:</strong> This confirmation link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
            
            <p>Questions? Our support team is here to help at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
          </div>
          <div class="footer">
            <p><strong>ProCann Edu</strong><br>
            Maryland Cannabis Training Platform<br>
            <a href="https://procannedu.com">procannedu.com</a></p>
          </div>
        </div>
      `;

    case 'magic-link':
      return `
        ${baseStyle}
        <div class="container">
          <div class="header">
            <h1>Your Magic Link</h1>
            <p>Quick and secure access to ProCann Edu</p>
          </div>
          <div class="content">
            <h2>Sign in to your account</h2>
            <p>Hi ${data.firstName || 'there'},</p>
            <p>Click the button below to instantly sign in to your ProCann Edu account:</p>
            
            <a href="${data.magicLink}" class="button">Sign In Now</a>
            
            <p><strong>Security Information:</strong></p>
            <ul>
              <li>This magic link expires in 1 hour</li>
              <li>It can only be used once</li>
              <li>Only use this link on the official ProCann Edu website</li>
              <li>If you didn't request this link, you can safely ignore this email</li>
            </ul>
            
            <p>If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.magicLink}" style="color: #059669; word-break: break-all;">${data.magicLink}</a></p>
            
            <p>For security questions or support, contact us at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
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