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
    const { user_id, escalation_type, level } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user details
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, organization_id, organizations(name, contact_email)")
      .eq("user_id", user_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);

    const router = new EmailRouter();
    let emailsSent = 0;

    // Send to user based on escalation type and level
    if (escalation_type === "invitation_ignored") {
      const messages = [
        { subject: "Haven't Started Yet? Here's What You're Missing", urgency: "📚" },
        { subject: "Final Reminder: Complete Your Training Registration", urgency: "⚠️" },
        { subject: "URGENT: Training Registration Required", urgency: "🚨" },
      ];

      const msg = messages[level - 1] || messages[0];

      await router.sendWithFailover(
        {
          to: authUser.user?.email!,
          subject: `${msg.urgency} ${msg.subject}`,
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #f59e0b;">${msg.urgency} Training Reminder</h1>
  <p>Hi ${profile?.first_name}, you were invited to complete Maryland Responsible Vendor Training by ${profile?.organizations?.name}.</p>
  ${level >= 2 ? '<p><strong>This is your final reminder.</strong> Please register and begin your training as soon as possible.</p>' : '<p>Training is required for compliance. Get started today!</p>'}
  <a href="https://www.procannedu.com/auth" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Start Training Now
  </a>
</div>
          `,
          from: "ProCann Edu <noreply@procannedu.com>",
          metadata: { email_type: "escalation", escalation_type, level },
        },
        supabase
      );
      emailsSent++;

      // Notify manager at level 2+
      if (level >= 2 && profile?.organizations?.contact_email) {
        await router.sendWithFailover(
          {
            to: profile.organizations.contact_email,
            subject: `Employee ${profile.first_name} Has Not Started Training`,
            html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #f59e0b;">⚠️ Employee Training Status Alert</h1>
  <p>${profile.first_name} (${authUser.user?.email}) has not started their training after multiple reminders.</p>
  <p><strong>Action needed:</strong> Please follow up directly with this employee.</p>
</div>
            `,
            from: "ProCann Edu <noreply@procannedu.com>",
            metadata: { email_type: "manager_notification", escalation_type },
          },
          supabase
        );
        emailsSent++;
      }
    } else if (escalation_type === "stalled_learner") {
      await router.sendWithFailover(
        {
          to: authUser.user?.email!,
          subject: "Pick Up Where You Left Off - Complete Your Training",
          html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #f59e0b;">📚 Continue Your Training</h1>
  <p>Hi ${profile?.first_name}, we noticed you started the training but haven't logged in recently.</p>
  <p>Don't lose your progress! Continue where you left off.</p>
  <a href="https://www.procannedu.com/course" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Continue Training
  </a>
</div>
          `,
          from: "ProCann Edu <noreply@procannedu.com>",
          metadata: { email_type: "escalation", escalation_type, level },
        },
        supabase
      );
      emailsSent++;
    }

    // Log escalation
    await supabase.from("escalation_log").insert({
      user_id,
      escalation_type,
      escalation_level: level,
      notified_manager: level >= 2,
    });

    return new Response(
      JSON.stringify({ success: true, emails_sent: emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending escalation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
