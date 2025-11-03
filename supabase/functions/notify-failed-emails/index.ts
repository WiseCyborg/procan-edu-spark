import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚨 Notify Failed Emails - Starting");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { emailLogId } = await req.json();

    // Fetch the failed email details
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', emailLogId)
      .single();

    if (logError || !emailLog) {
      throw new Error(`Email log not found: ${emailLogId}`);
    }

    console.log("📧 Failed email details:", {
      recipient: emailLog.recipient_email,
      type: emailLog.email_type,
      error: emailLog.error_message
    });

    // Insert notification for admin
    const { error: notifError } = await supabase
      .from('notification_queue')
      .insert({
        notification_type: 'email_failure_alert',
        priority: 'high',
        title: `Email Delivery Failed: ${emailLog.email_type}`,
        message: `Failed to send ${emailLog.email_type} email to ${emailLog.recipient_email}. Error: ${emailLog.error_message || 'Unknown error'}`,
        target_users: ['admin'],
        action_url: `/admin/operations?tab=email`,
        metadata: {
          email_log_id: emailLogId,
          recipient: emailLog.recipient_email,
          email_type: emailLog.email_type,
          error: emailLog.error_message,
          subject: emailLog.subject
        }
      });

    if (notifError) {
      console.error("Failed to create notification:", notifError);
    }

    // TODO: In production, send to Slack/Discord webhook
    // const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    // if (webhookUrl) {
    //   await fetch(webhookUrl, {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({
    //       text: `🚨 Email Failure Alert`,
    //       attachments: [{
    //         color: "danger",
    //         fields: [
    //           { title: "Recipient", value: emailLog.recipient_email, short: true },
    //           { title: "Type", value: emailLog.email_type, short: true },
    //           { title: "Error", value: emailLog.error_message || "Unknown" }
    //         ]
    //       }]
    //     })
    //   });
    // }

    console.log("✅ Admin notified of email failure");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Admin notified of email failure" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("❌ Error in notify-failed-emails:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
