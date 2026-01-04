import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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
    const { user_id, message, sent_by } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user details
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name, user_id")
      .eq("user_id", user_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);

    if (!authUser.user?.email) {
      throw new Error("User email not found");
    }

    // Check email preferences
    const canSend = await supabase.rpc("check_email_preference", {
      p_user_id: user_id,
      p_email_type: "reminders",
    });

    if (!canSend.data) {
      console.log(`User ${user_id} has disabled reminder emails`);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "User preference" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Training Reminder</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #4a4a4a; line-height: 1.6; }
    .button { display: inline-block; background: #16a34a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Training Reminder</h1>
    </div>
    <div class="content">
      <h2>Hello ${profile?.first_name || 'there'}!</h2>
      <p>${message}</p>
      
      <a href="https://procann-edu.lovable.app/course" class="button">Continue Training</a>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        Need help? Contact your training coordinator or email support@procannedu.com
      </p>
    </div>
    <div class="footer">
      <p><strong>ProCann Edu</strong> - Maryland Cannabis Compliance Training</p>
      <p>© 2025 ProCann Edu. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `;

    const router = new EmailRouter();
    const result = await router.sendWithFailover(
      {
        to: authUser.user.email,
        subject: "Training Reminder - ProCann Edu",
        html,
        from: "ProCann Edu <noreply@procannedu.com>",
        metadata: { email_type: "reminder", sent_by },
      },
      supabase
    );

    return new Response(
      JSON.stringify({ success: true, emailId: result.providerId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending reminder:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
