import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { EmailRouter } from "../_shared/email-router.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Server-side validation schema
const EmployeeInvitationSchema = z.object({
  employeeEmail: z.string().trim().email().max(255).toLowerCase(),
  organizationName: z.string().trim().min(2).max(200),
  invitationToken: z.string().trim().min(10).max(100),
  deadline: z.string().refine((date) => !isNaN(Date.parse(date)), "Invalid deadline date")
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    
    // VALIDATE INPUT
    const validationResult = EmployeeInvitationSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error('[VALIDATION ERROR]', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          code: 'VALIDATION_ERROR'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const { 
      employeeEmail, 
      organizationName, 
      invitationToken,
      deadline 
    } = validationResult.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const registrationUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/auth?invite=${invitationToken}`;

    const router = new EmailRouter();
    const emailResult = await router.sendWithFailover({
      to: employeeEmail,
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
      from: "ProCannEdu <noreply@procannedu.com>",
      metadata: { email_type: 'employee_invitation', organization_name: organizationName }
    }, supabase);

    return new Response(JSON.stringify({ 
      success: true,
      emailId: emailResult.providerId,
      provider: emailResult.provider
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
