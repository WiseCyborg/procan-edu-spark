import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EmailService } from "../_shared/email-service.ts";
import { loadEmailTemplate } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const emailService = new EmailService();

    console.log("Processing notification queue...");

    // Get pending notifications that are scheduled to be sent
    const { data: notifications, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .limit(50);

    if (fetchError) throw fetchError;

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${notifications.length} notifications`);

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of notifications) {
      try {
        // Mark as processing
        await supabase
          .from("notification_queue")
          .update({ status: "processing" })
          .eq("id", notification.id);

        let html = notification.message;

        // If metadata contains template name, load template
        if (notification.metadata?.template) {
          try {
            html = await loadEmailTemplate(
              notification.metadata.template,
              notification.metadata
            );
          } catch (templateError) {
            console.error(`Template load error for ${notification.metadata.template}:`, templateError);
            // Fall back to plain message
          }
        }

        // Send email
        const result = await emailService.send({
          to: notification.recipient_email,
          subject: notification.subject,
          html,
        });

        if (result.success) {
          await supabase
            .from("notification_queue")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
            })
            .eq("id", notification.id);

          // Log to email_logs
          await supabase.from("email_logs").insert({
            recipient_email: notification.recipient_email,
            subject: notification.subject,
            email_type: notification.metadata?.template || "notification",
            delivery_status: "sent",
            metadata: notification.metadata,
          });

          sentCount++;
        } else {
          throw new Error("Email send failed");
        }
      } catch (error: any) {
        console.error(`Failed to send notification ${notification.id}:`, error);

        // Mark as failed and increment retry count
        await supabase
          .from("notification_queue")
          .update({
            status: notification.retry_count >= 3 ? "failed" : "pending",
            retry_count: (notification.retry_count || 0) + 1,
            last_error: error.message,
          })
          .eq("id", notification.id);

        // Log failure
        await supabase.from("email_logs").insert({
          recipient_email: notification.recipient_email,
          subject: notification.subject,
          email_type: notification.metadata?.template || "notification",
          delivery_status: "failed",
          error_message: error.message,
          metadata: notification.metadata,
        });

        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: notifications.length,
        sent: sentCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing notification queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
