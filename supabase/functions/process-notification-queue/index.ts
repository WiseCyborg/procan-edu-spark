import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { EmailRouter } from "../_shared/email-router.ts";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("Processing notification queue...");

    // Get pending notifications scheduled for now or earlier
    const { data: notifications, error } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }

    console.log(`Found ${notifications?.length || 0} notifications to process`);

    let sentCount = 0;
    let failedCount = 0;

    const router = new EmailRouter();

    for (const notification of notifications || []) {
      try {
        // Update status to sending
        await supabase
          .from("notification_queue")
          .update({ status: "sending" })
          .eq("id", notification.id);

        // Convert plain text message to HTML
        const htmlMessage = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.subject}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #4a4a4a; line-height: 1.6; white-space: pre-line; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌿 ProCann Edu</h1>
    </div>
    <div class="content">
      ${notification.message}
    </div>
    <div class="footer">
      <p><strong>ProCann Edu</strong> - Maryland Cannabis Compliance Training</p>
      <p>Questions? Contact us at <a href="mailto:support@procannedu.com">support@procannedu.com</a></p>
      <p>© 2025 ProCann Edu. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        // Send email using router with failover
        const result = await router.sendWithFailover(
          {
            to: notification.recipient_email,
            subject: notification.subject,
            html: htmlMessage,
            from: "ProCann Edu <noreply@procannedu.com>",
            metadata: {
              notification_id: notification.id,
              priority: notification.priority,
              ...(notification.metadata || {}),
            },
          },
          supabase
        );

        // Update status to sent
        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: (notification.attempts || 0) + 1,
          })
          .eq("id", notification.id);

        sentCount++;
        console.log(`✓ Sent notification ${notification.id} to ${notification.recipient_email}`);
      } catch (emailError) {
        console.error(`Failed to send notification ${notification.id}:`, emailError);

        const attempts = (notification.attempts || 0) + 1;
        const maxAttempts = 3;

        // Update status to failed or retry
        await supabase
          .from("notification_queue")
          .update({
            status: attempts >= maxAttempts ? "failed" : "pending",
            attempts: attempts,
            error_message: emailError.message,
          })
          .eq("id", notification.id);

        failedCount++;
      }
    }

    console.log(`Notification queue processed: ${sentCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: notifications?.length || 0,
        sent: sentCount,
        failed: failedCount,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-notification-queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
