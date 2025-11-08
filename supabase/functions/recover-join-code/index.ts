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
    const { email } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log(`Join code recovery requested for: ${email}`);

    // Find active invitations or enrollments for this email
    const { data: invitation } = await supabase
      .from("staff_invitations")
      .select("*, organizations(name, unique_access_key)")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (!invitation?.organizations?.unique_access_key) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No active invitation found for this email" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Get join code
    const { data: joinCode } = await supabase
      .from("rvt_join_codes")
      .select("code")
      .eq("organization_id", invitation.organizations.id)
      .eq("is_active", true)
      .single();

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Join Code</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 28px; }
    .content { padding: 40px 30px; color: #4a4a4a; }
    .code-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a; text-align: center; }
    .code { font-size: 24px; font-weight: bold; color: #16a34a; letter-spacing: 2px; }
    .button { display: inline-block; background: #16a34a; color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px; text-align: center; color: #6b7280; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Your Join Code</h1>
    </div>
    <div class="content">
      <h2>Hello!</h2>
      <p>You requested your join code for ${invitation.organizations.name}.</p>
      
      <div class="code-box">
        <p style="margin: 0; font-size: 14px; color: #6b7280;">Your Join Code:</p>
        <div class="code">${joinCode?.code || 'Contact your administrator'}</div>
      </div>

      <p>Use this code when registering at:</p>
      <a href="https://www.procannedu.com/auth?role=student" class="button">Start Training</a>
      
      <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
        If you didn't request this, please ignore this email or contact support@procannedu.com
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
    await router.sendWithFailover(
      {
        to: email,
        subject: "Your ProCann Edu Join Code",
        html,
        from: "ProCann Edu <noreply@procannedu.com>",
        metadata: { email_type: "join_code_recovery" },
      },
      supabase
    );

    // Log in security audit
    await supabase.from("security_audit_log").insert({
      table_name: "rvt_join_codes",
      action_type: "JOIN_CODE_RECOVERY",
      new_values: { email, recovered_at: new Date().toISOString() },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Join code sent to email" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error recovering join code:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
