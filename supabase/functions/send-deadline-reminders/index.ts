import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { SMTPEmailService } from "../_shared/smtp-email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get enrollments with deadlines in 7, 3, or 1 day(s)
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const { data: enrollments, error } = await supabaseService
      .from("rvt_enrollments")
      .select(`
        *,
        profiles:user_id(first_name, last_name),
        users:user_id(email)
      `)
      .is("completed_at", null)
      .or(`deadline_at.eq.${sevenDays.toISOString().split('T')[0]},deadline_at.eq.${threeDays.toISOString().split('T')[0]},deadline_at.eq.${oneDay.toISOString().split('T')[0]}`);

    if (error) {
      console.error("Error fetching enrollments:", error);
      throw error;
    }

    let sentCount = 0;

    for (const enrollment of enrollments || []) {
      const daysRemaining = Math.ceil((new Date(enrollment.deadline_at).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      
      const urgencyLevel = daysRemaining === 1 ? "🚨 URGENT" : 
                           daysRemaining === 3 ? "⚠️ Important" : 
                           "📅 Reminder";

      try {
        const emailService = new SMTPEmailService();
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: ${daysRemaining === 1 ? '#dc2626' : '#f59e0b'};">${urgencyLevel}</h1>
            <p>Hi ${enrollment.profiles?.first_name || 'there'},</p>
            <p>Your Maryland Responsible Vendor Training deadline is approaching soon.</p>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <h3 style="margin-top: 0;">⏰ ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''} Remaining</h3>
              <p><strong>Deadline:</strong> ${new Date(enrollment.deadline_at).toLocaleDateString()}</p>
              <p><strong>Progress:</strong> ${enrollment.completion_percentage}% complete</p>
            </div>

            <p>${daysRemaining === 1 ? 
              'This is your final reminder! Complete your training today to meet the deadline.' : 
              'Don\'t wait until the last minute. Log in now to continue your training.'
            }</p>

            <a href="https://www.procannedu.com/course" 
               style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Continue Training
            </a>

            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Need help? Contact your training coordinator or email support@procannedu.com
            </p>
          </div>
        `;

        const result = await emailService.sendEmail({
          to: enrollment.users.email,
          subject: `${urgencyLevel}: Training Deadline in ${daysRemaining} Day${daysRemaining > 1 ? 's' : ''}`,
          html,
          from: "ProCannEdu <noreply@procannedu.com>",
        });
        await emailService.close();

        if (result.success) {
          sentCount++;
        } else {
          console.error(`Failed to send reminder to ${enrollment.users.email}:`, result.error);
        }
      } catch (emailError) {
        console.error(`Failed to send reminder to ${enrollment.users.email}:`, emailError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      remindersSent: sentCount,
      totalProcessed: enrollments?.length || 0
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-deadline-reminders:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
