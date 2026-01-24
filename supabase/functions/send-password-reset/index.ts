import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EmailRouter } from "../_shared/email-router.ts";
import { DOMAINS } from "../_shared/domains.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Password reset requested for: ${email}`);

    // Check if user exists in profiles
    const { data: user } = await supabase
      .from("profiles")
      .select("user_id, first_name")
      .eq("email_cache", email)
      .single();

    // If no account found, return early with email_exists: false
    if (!user?.user_id) {
      console.log(`No account found for email: ${email}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          email_exists: false,
          message: "No account found with this email address" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Rate limiting check
    const canProceed = await supabase.rpc("check_rate_limit", {
      _user_id: user.user_id,
      _action_type: "password_reset",
      _max_requests: 3,
      _window_minutes: 60,
    });

    if (!canProceed.data) {
      return new Response(
        JSON.stringify({ 
          error: "Too many password reset attempts. Please try again in 1 hour.",
          email_exists: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Generate secure token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in database
    await supabase.from("password_reset_tokens").insert({
      user_id: user.user_id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    const resetUrl = `${DOMAINS.PRODUCTION}/auth?mode=reset&token=${token}`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #4a4a4a; }
    .button { display: inline-block; background: #16a34a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
    .security-notice { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <h2>Hello ${user.first_name || 'there'}!</h2>
      <p>We received a request to reset your password for your ProCann Edu account.</p>
      
      <p>Click the button below to reset your password:</p>
      
      <a href="${resetUrl}" class="button">Reset Your Password</a>
      
      <div class="security-notice">
        <strong>⚠️ Important - Read Before Clicking:</strong>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>This link expires in 24 hours</li>
          <li><strong>Only click this link once</strong> - it becomes invalid after use</li>
          <li>If you're on iOS, tap the link directly instead of letting Mail preview it</li>
          <li>If you didn't request this reset, please ignore this email</li>
        </ul>
      </div>

      <p style="color: #6b7280; font-size: 14px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <span style="word-break: break-all;">${resetUrl}</span>
      </p>
      
      <p>Best regards,<br>The ProCann Edu Team</p>
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

    const router = new EmailRouter();
    const result = await router.sendWithFailover(
      {
        to: email,
        subject: "Reset Your ProCann Edu Password",
        html,
        from: "ProCann Edu <noreply@procannedu.com>",
        metadata: { email_type: "password_reset" },
      },
      supabase
    );

    // Log in security audit
    await supabase.from("security_audit_log").insert({
      user_id: user.user_id,
      table_name: "password_reset_tokens",
      action_type: "PASSWORD_RESET_REQUEST",
      new_values: { token_expires_at: expiresAt.toISOString() },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        email_exists: true,
        message: "Password reset email sent" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error sending password reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
