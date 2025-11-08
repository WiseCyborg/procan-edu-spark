import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { EmailRouter } from "../_shared/email-router.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ONBOARDING_SEQUENCES = {
  dispensary_manager: [
    {
      day: 1,
      subject: "Welcome! Get Started with Your Training Dashboard",
      template: "manager_day1",
    },
    {
      day: 3,
      subject: "Quick Tip: Understanding Your Training Dashboard",
      template: "manager_day3",
    },
    {
      day: 7,
      subject: "Haven't Invited Employees Yet? Here's Why It Matters",
      template: "manager_day7",
    },
  ],
  training_coordinator: [
    {
      day: 1,
      subject: "Your Coordinator Dashboard Guide",
      template: "coordinator_day1",
    },
    {
      day: 3,
      subject: "How to Track Team Progress Effectively",
      template: "coordinator_day3",
    },
    {
      day: 7,
      subject: "Tips for Encouraging Course Completion",
      template: "coordinator_day7",
    },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, role, day } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sequence = ONBOARDING_SEQUENCES[role as keyof typeof ONBOARDING_SEQUENCES];
    if (!sequence) {
      throw new Error(`No onboarding sequence for role: ${role}`);
    }

    const email = sequence.find((e) => e.day === day);
    if (!email) {
      throw new Error(`No email for day ${day}`);
    }

    // Get user details
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, organization_id, organizations(name)")
      .eq("user_id", user_id)
      .single();

    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);

    // Check email preferences
    const canSend = await supabase.rpc("check_email_preference", {
      p_user_id: user_id,
      p_email_type: "marketing",
    });

    if (!canSend.data) {
      return new Response(
        JSON.stringify({ success: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlTemplates = {
      manager_day1: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a;">🎉 Welcome to ProCann Edu, ${profile?.first_name}!</h1>
  <p>You're all set up as a dispensary manager. Here's how to get started:</p>
  <ol>
    <li><strong>Explore Your Dashboard</strong> - See training progress at a glance</li>
    <li><strong>Invite Your Team</strong> - Send training invitations to employees</li>
    <li><strong>Track Progress</strong> - Monitor who's completed their training</li>
  </ol>
  <a href="https://www.procannedu.com/dispensary-portal" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
    Go to Dashboard
  </a>
</div>
      `,
      manager_day3: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a;">📊 Understanding Your Dashboard</h1>
  <p>Hi ${profile?.first_name}, here are some quick tips:</p>
  <ul>
    <li><strong>Available Seats</strong> - Shows how many training slots you have left</li>
    <li><strong>Active Learners</strong> - Employees currently taking the course</li>
    <li><strong>Completion Rate</strong> - Track your team's progress</li>
  </ul>
  <p>Pro tip: Set deadlines for employees to keep training on track!</p>
</div>
      `,
      manager_day7: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #f59e0b;">⏰ Still Haven't Invited Your Team?</h1>
  <p>Hi ${profile?.first_name}, we noticed you haven't sent any invitations yet.</p>
  <p><strong>Why it matters:</strong></p>
  <ul>
    <li>Maryland compliance requires trained employees</li>
    <li>Early training reduces onboarding time</li>
    <li>Your team gains essential knowledge</li>
  </ul>
  <a href="https://www.procannedu.com/dispensary-portal" style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
    Invite Your Team Now
  </a>
</div>
      `,
      coordinator_day1: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a;">🎓 Welcome, Training Coordinator!</h1>
  <p>Hi ${profile?.first_name}, you're ready to manage training at ${profile?.organizations?.name}.</p>
  <p><strong>Your coordinator tools:</strong></p>
  <ul>
    <li>View all team members' progress</li>
    <li>Send reminders to learners</li>
    <li>Track completion rates</li>
    <li>Generate reports</li>
  </ul>
</div>
      `,
      coordinator_day3: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a;">📈 Tracking Team Progress</h1>
  <p>Hi ${profile?.first_name}, here's how to keep your team on track:</p>
  <ol>
    <li>Check the progress dashboard weekly</li>
    <li>Send reminders to learners behind schedule</li>
    <li>Celebrate completions with your team</li>
  </ol>
</div>
      `,
      coordinator_day7: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #16a34a;">💡 Encouraging Completion</h1>
  <p>Hi ${profile?.first_name}, tips for boosting completion rates:</p>
  <ul>
    <li>Set clear deadlines</li>
    <li>Provide dedicated study time</li>
    <li>Recognize and reward completions</li>
    <li>Address technical issues quickly</li>
  </ul>
</div>
      `,
    };

    const html = htmlTemplates[email.template as keyof typeof htmlTemplates];

    const router = new EmailRouter();
    await router.sendWithFailover(
      {
        to: authUser.user?.email!,
        subject: email.subject,
        html,
        from: "ProCann Edu <noreply@procannedu.com>",
        metadata: { email_type: "onboarding", role, day },
      },
      supabase
    );

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending onboarding email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
