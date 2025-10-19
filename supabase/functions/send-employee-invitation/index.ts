import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      employeeEmail, 
      organizationName, 
      invitationToken,
      deadline 
    } = await req.json();

    const registrationUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/auth?invite=${invitationToken}`;

    const emailResult = await resend.emails.send({
      from: "ProCannEdu <noreply@procannedu.com>",
      to: [employeeEmail],
      subject: `🎓 You're Invited to Complete Responsible Vendor Training`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">Welcome to ProCannEdu!</h1>
          <p>You've been invited by <strong>${organizationName}</strong> to complete Maryland Responsible Vendor Training.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Training Details</h3>
            <p><strong>Organization:</strong> ${organizationName}</p>
            <p><strong>Course:</strong> Maryland Responsible Vendor Training</p>
            <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
            <p><strong>Duration:</strong> Approximately 3-4 hours</p>
          </div>

          <h3>What to Expect:</h3>
          <ul>
            <li>Interactive course modules covering Maryland cannabis regulations</li>
            <li>Stoplight tier progression system (Green → Yellow → Red)</li>
            <li>Quizzes to test your knowledge</li>
            <li>Official certificate upon completion</li>
          </ul>

          <a href="${registrationUrl}" 
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Start Training Now
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            This invitation link will expire in 7 days. If you have any questions, please contact your training coordinator.
          </p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.data?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending employee invitation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
