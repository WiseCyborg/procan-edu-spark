import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
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
      coordinatorEmail, 
      coordinatorName, 
      organizationName, 
      quantity, 
      amountPaid,
      purchaseId 
    } = await req.json();

    // Send confirmation email to coordinator
    const coordinatorEmail_result = await resend.emails.send({
      from: "ProCannEdu <noreply@procannedu.com>",
      to: [coordinatorEmail],
      subject: `✅ Seat Purchase Confirmation - ${quantity} Seats`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">🎉 Purchase Successful!</h1>
          <p>Hi ${coordinatorName},</p>
          <p>Thank you for your purchase! You've successfully purchased <strong>${quantity} training seats</strong> for <strong>${organizationName}</strong>.</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Purchase Summary</h3>
            <p><strong>Organization:</strong> ${organizationName}</p>
            <p><strong>Seats Purchased:</strong> ${quantity}</p>
            <p><strong>Amount Paid:</strong> $${amountPaid}</p>
            <p><strong>Purchase ID:</strong> ${purchaseId}</p>
          </div>

          <h3>Next Steps:</h3>
          <ol>
            <li><strong>Invite Employees:</strong> Go to your Team Management portal to send email invitations to your employees.</li>
            <li><strong>Share Join Code:</strong> Alternatively, generate a join code that employees can use to self-register.</li>
            <li><strong>Track Progress:</strong> Monitor employee progress and completion rates from your dashboard.</li>
          </ol>

          <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/team-management" 
             style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Go to Team Management
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Questions? Contact us at support@procannedu.com
          </p>
        </div>
      `,
    });

    // Send notification to admin
    const adminEmail = await resend.emails.send({
      from: "ProCannEdu Admin <admin@procannedu.com>",
      to: ["admin@procannedu.com"],
      subject: `📊 New Seat Purchase - ${organizationName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Seat Purchase</h2>
          <p><strong>Organization:</strong> ${organizationName}</p>
          <p><strong>Coordinator:</strong> ${coordinatorName} (${coordinatorEmail})</p>
          <p><strong>Seats Purchased:</strong> ${quantity}</p>
          <p><strong>Amount Paid:</strong> $${amountPaid}</p>
          <p><strong>Purchase ID:</strong> ${purchaseId}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `,
    });

    return new Response(JSON.stringify({ 
      success: true,
      coordinatorEmailId: coordinatorEmail_result.data?.id,
      adminEmailId: adminEmail.data?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error sending purchase confirmation:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
