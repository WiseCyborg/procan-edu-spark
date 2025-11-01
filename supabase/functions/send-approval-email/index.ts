import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailRouter } from "../_shared/email-router.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApprovalEmailRequest {
  contact_email: string;
  contact_person: string;
  organization_name: string;
  access_key: string;
  registration_url: string;
  credits: number;
  join_code?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: ApprovalEmailRequest = await req.json();
    console.log('📧 [v1.1] Sending approval email to:', payload.contact_email); // Redeployment trigger

    // Load and render template
    const htmlContent = await loadEmailTemplate('application-approved', {
      ContactPerson: payload.contact_person,
      OrganizationName: payload.organization_name,
      AccessKey: payload.access_key,
      RegistrationURL: payload.registration_url,
      Credits: payload.credits.toString(),
      JoinCode: payload.join_code || ''
    });

    // Create email log entry
    const { data: logData, error: logError } = await supabase
      .from('email_logs')
      .insert({
        email_type: 'application_approved',
        recipient_email: payload.contact_email,
        subject: '🎉 Your Dispensary Application Has Been Approved!',
        status: 'pending',
        html_content: htmlContent,
        metadata: {
          organization_name: payload.organization_name,
          access_key: payload.access_key,
          credits: payload.credits
        }
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to create email log:', logError);
    }

    const emailLogId = logData?.id;

    // Send email using router with failover
    const emailRouter = new EmailRouter();
    const result = await emailRouter.sendWithFailover({
      to: payload.contact_email,
      subject: '🎉 Your Dispensary Application Has Been Approved!',
      html: htmlContent,
      from: 'ProCann Edu <noreply@procannedu.com>',
      metadata: {
        organization_name: payload.organization_name,
        registration_url: payload.registration_url
      }
    }, supabase);

    // Update email log with result
    if (emailLogId) {
      await supabase
        .from('email_logs')
        .update({
          status: result.success ? 'sent' : 'failed',
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.error || null,
          provider: result.provider,
          metadata: {
            organization_name: payload.organization_name,
            access_key: payload.access_key,
            credits: payload.credits,
            send_result: result
          }
        })
        .eq('id', emailLogId);
    }

    if (!result.success) {
      throw new Error(`Email send failed: ${result.error}`);
    }

    console.log('✅ Approval email sent successfully via', result.provider);

    return new Response(
      JSON.stringify({
        success: true,
        provider: result.provider,
        message: 'Approval email sent successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Error sending approval email:', error);
    
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
