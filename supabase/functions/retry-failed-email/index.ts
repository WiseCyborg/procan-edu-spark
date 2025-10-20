import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email_id } = await req.json();

    if (!email_id) {
      throw new Error("email_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get original email details
    const { data: originalEmail, error: fetchError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', email_id)
      .single();

    if (fetchError || !originalEmail) {
      throw new Error("Email not found");
    }

    // Attempt to resend using Resend API
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    try {
      const { data: emailData, error: sendError } = await resend.emails.send({
        from: "ProCann Edu <noreply@procannedu.com>",
        to: [originalEmail.recipient_email],
        subject: originalEmail.metadata?.subject || originalEmail.subject || "Message from ProCann Edu",
        html: originalEmail.metadata?.html || originalEmail.html_content || "<p>Please contact support</p>",
      });

      if (sendError) throw sendError;

      // Update email log status
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider: 'resend',
          provider_id: emailData?.id,
          error_message: null,
          metadata: {
            ...originalEmail.metadata,
            retry_count: (originalEmail.metadata?.retry_count || 0) + 1,
            retry_at: new Date().toISOString()
          }
        })
        .eq('id', email_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email resent successfully",
          status: 'sent',
          provider: 'resend',
          email_id: emailData?.id
        }), 
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (resendError: any) {
      // Log retry failure
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          error_message: `Retry failed: ${resendError.message}`,
          metadata: {
            ...originalEmail.metadata,
            retry_count: (originalEmail.metadata?.retry_count || 0) + 1,
            last_retry_error: resendError.message,
            last_retry_at: new Date().toISOString()
          }
        })
        .eq('id', email_id);

      throw new Error(`Resend failed: ${resendError.message}`);
    }
  } catch (error: any) {
    console.error("Error retrying email:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
