import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailRouter } from "../_shared/email-router.ts";
import { log } from "../_shared/logger.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // PHASE 3: Check email circuit breaker before proceeding
    const { data: circuitData } = await supabase.rpc('check_email_circuit');
    if (circuitData && circuitData[0]?.is_open) {
      log('warn', 'email.circuit_breaker.open', {
        message: 'Email circuit breaker is OPEN - service temporarily unavailable'
      });
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email service temporarily unavailable. Notification queued for retry.',
          circuitOpen: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    const { 
      application_id, 
      contact_person, 
      contact_email, 
      organization_name,
      license_number 
    } = await req.json();

    console.log('📧 [v1.2] Sending application confirmation email to:', contact_email);

    // Load email template
    const html = await loadEmailTemplate('application-received', {
      ContactPerson: contact_person,
      OrganizationName: organization_name,
      ContactEmail: contact_email,
      LicenseNumber: license_number,
      ApplicationId: application_id
    });

    log('info', 'email.application_confirmation.attempt', {
      recipient: contact_email,
      organization: organization_name,
      application_id,
    });

    // Log email attempt
    const { data: logData } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: contact_email,
        email_type: 'application_confirmation',
        status: 'sending',
        template_name: 'application-received',
        template_data: { 
          organization_name, 
          application_id,
          license_number 
        }
      })
      .select('id')
      .single();

    // Send email using router with failover
    const emailRouter = new EmailRouter();
    const result = await emailRouter.sendWithFailover(
      {
        to: contact_email,
        subject: "✅ Application Received - ProCannEdu",
        html,
        metadata: {
          application_id,
          organization_name,
          type: 'application_confirmation'
        }
      },
      supabase
    );

    log('info', 'email.application_confirmation.success', {
      provider: result.provider,
      providerId: result.providerId,
      responseTime: result.responseTime,
      recipient: contact_email,
    });

    // Update log with result
    if (logData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: result.success ? 'sent' : 'failed',
          provider: result.provider,
          sent_at: new Date().toISOString(),
          error_message: result.error ? JSON.stringify(result.error) : null
        })
        .eq('id', logData.id);
    }

    if (!result.success) {
      // PHASE 3: Record email failure in circuit breaker
      await supabase.rpc('record_email_result', { p_success: false });
      throw new Error(`Email sending failed: ${result.error}`);
    }

    // PHASE 3: Record email success in circuit breaker
    await supabase.rpc('record_email_result', { p_success: true });

    console.log('✅ Application confirmation email sent successfully via', result.provider);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Confirmation email sent',
        provider: result.provider 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending application confirmation:", error);
    
    // Record failure in circuit breaker
    try {
      await supabase.rpc('record_email_result', { p_success: false });
    } catch (cbError) {
      console.error("Failed to record circuit breaker result:", cbError);
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
