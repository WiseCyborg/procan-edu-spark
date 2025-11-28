import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  targetEmail: string;
  emailTypes?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { targetEmail, emailTypes }: TestEmailRequest = await req.json();
    
    console.log(`Sending test emails to ${targetEmail}`);

    const baseUrl = 'https://www.procannedu.com';

    // Define all email types with test data
    const allEmailTypes = [
      {
        name: 'welcome',
        template: 'welcome',
        subject: 'Welcome to ProCann Edu!',
        data: {
          FirstName: 'Test',
          LastName: 'User',
          DashboardURL: `${baseUrl}/dashboard`,
          Email: targetEmail,
        }
      },
      {
        name: 'certificate',
        template: 'certificate',
        subject: 'Your ProCann Edu Certificate',
        data: {
          FirstName: 'Test',
          LastName: 'User',
          CertificateNumber: 'CERT-2025-294-1234',
          IssueDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          ExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          CourseTitle: 'Maryland Responsible Vendor Training',
          DownloadURL: `${baseUrl}/certificates`,
          VerificationURL: `${baseUrl}/certificate-verification?cert=CERT-2025-294-1234`,
        }
      },
      {
        name: 'invite',
        template: 'invite',
        subject: 'You\'re Invited to Join ProCann Edu',
        data: {
          Email: targetEmail,
          OrganizationName: 'ProCann Test Organization',
          InviterName: 'Test Manager',
          Role: 'Student',
          InvitationToken: 'TEST-INVITE-TOKEN-123',
          ExpiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          AcceptInvitationURL: `${baseUrl}/auth?role=student&invitation=TEST-INVITE-TOKEN-123`,
          CustomMessage: 'We\'re excited to have you join our team for compliance training!',
        }
      },
      {
        name: 'confirm-signup',
        template: 'confirm-signup',
        subject: 'Confirm Your Email Address',
        data: {
          ConfirmationURL: `${baseUrl}/auth/confirm?token=TEST-CONFIRMATION-TOKEN`,
          Email: targetEmail,
        }
      },
      {
        name: 'reset-password',
        template: 'reset-password',
        subject: 'Reset Your Password',
        data: {
          ResetURL: `${baseUrl}/auth/reset-password?token=TEST-RESET-TOKEN`,
          Email: targetEmail,
        }
      },
      {
        name: 'magic-link',
        template: 'magic-link',
        subject: 'Your Magic Sign-In Link',
        data: {
          MagicLinkURL: `${baseUrl}/auth/confirm?token=TEST-MAGIC-TOKEN&type=magiclink`,
          Email: targetEmail,
        }
      },
      {
        name: 'seat-purchase-confirmation',
        template: 'seat-purchase-confirmation',
        subject: 'Seat Purchase Confirmation',
        data: {
          OrganizationName: 'ProCann Test Organization',
          Quantity: '10',
          Amount: '$499.00',
          OrderNumber: 'ORDER-2025-1234',
          PurchaseDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          ManagementURL: `${baseUrl}/team-management`,
        }
      },
      {
        name: 'application-approved',
        template: 'application-approved',
        subject: 'Your Dispensary Application Has Been Approved',
        data: {
          OrganizationName: 'ProCann Test Dispensary',
          AccessKey: 'DISP-2025-TESTKEY1',
          Credits: '10',
          DashboardURL: `${baseUrl}/dispensary-portal`,
          ContactEmail: 'support@procannedu.com',
        }
      },
      {
        name: 'application-rejected',
        template: 'application-rejected',
        subject: 'Update on Your Dispensary Application',
        data: {
          OrganizationName: 'ProCann Test Dispensary',
          RejectionReason: 'This is a test rejection for demonstration purposes only.',
          ContactEmail: 'support@procannedu.com',
          ReapplyURL: `${baseUrl}/dispensary-application`,
        }
      },
      {
        name: 'profile-change-alert',
        template: 'profile-change-alert',
        subject: 'Your Profile Was Recently Updated',
        data: {
          FirstName: 'Test',
          ChangeType: 'email address',
          ChangeTimestamp: new Date().toLocaleString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            timeZoneName: 'short'
          }),
          ProfileURL: `${baseUrl}/profile`,
          SupportEmail: 'support@procannedu.com',
        }
      },
      {
        name: 'change-email',
        template: 'change-email',
        subject: 'Confirm Your New Email Address',
        data: {
          ConfirmationURL: `${baseUrl}/auth/confirm?token=TEST-EMAIL-CHANGE-TOKEN`,
          NewEmail: targetEmail,
        }
      },
      {
        name: 'training-coordinator-welcome',
        template: 'training-coordinator-welcome',
        subject: 'Welcome as Training Coordinator',
        data: {
          FirstName: 'Test',
          OrganizationName: 'ProCann Test Organization',
          DashboardURL: `${baseUrl}/training-coordinator`,
          SupportEmail: 'support@procannedu.com',
        }
      },
      {
        name: 'verification-code',
        template: 'confirm-signup',
        subject: 'Your Verification Code',
        data: {
          Code: '123456',
          ExpiryMinutes: '10',
          Email: targetEmail,
        }
      },
    ];

    // Filter to specific types if requested
    const emailsToSend = emailTypes && emailTypes.length > 0
      ? allEmailTypes.filter(e => emailTypes.includes(e.name))
      : allEmailTypes;

    const results = [];

    for (const emailType of emailsToSend) {
      const startTime = Date.now();
      
      try {
        // Load and render template
        const html = await loadEmailTemplate(emailType.template, emailType.data);

        // Send email
        const emailResponse = await resend.emails.send({
          from: "ProCann Edu <noreply@procannedu.com>",
          to: [targetEmail],
          subject: `[TEST] ${emailType.subject}`,
          html,
        });

        const sendTime = Date.now() - startTime;

        if (emailResponse.error) {
          throw new Error(emailResponse.error.message);
        }

        // Log to email_logs
        await supabase.from('email_logs').insert({
          recipient_email: targetEmail,
          email_type: emailType.name,
          subject: `[TEST] ${emailType.subject}`,
          status: 'sent',
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString(),
          metadata: {
            test_email: true,
            template: emailType.template,
            send_time_ms: sendTime,
          }
        });

        results.push({
          name: emailType.name,
          status: 'success',
          sendTime,
          providerId: emailResponse.data?.id,
        });

        console.log(`✅ Sent ${emailType.name} in ${sendTime}ms`);

      } catch (error: any) {
        const sendTime = Date.now() - startTime;
        
        // Log failure
        await supabase.from('email_logs').insert({
          recipient_email: targetEmail,
          email_type: emailType.name,
          subject: `[TEST] ${emailType.subject}`,
          status: 'failed',
          error_message: error.message,
          metadata: {
            test_email: true,
            template: emailType.template,
            send_time_ms: sendTime,
          }
        });

        results.push({
          name: emailType.name,
          status: 'failed',
          error: error.message,
          sendTime,
        });

        console.error(`❌ Failed to send ${emailType.name}: ${error.message}`);
      }

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const avgSendTime = results.reduce((sum, r) => sum + r.sendTime, 0) / results.length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.length,
          successful,
          failed,
          avgSendTime: Math.round(avgSendTime),
        },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("Error in send-test-emails function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
