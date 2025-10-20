import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

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

    // Load coordinator email template
    const coordinatorHtml = await loadEmailTemplate('seat-purchase-confirmation', {
      OrganizationName: organizationName,
      Quantity: quantity.toString(),
      Amount: amountPaid.toString(),
      PurchaseDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      ManageLink: 'https://www.procannedu.com/team-management',
    });

    // Log coordinator email
    const { data: coordLogData } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: coordinatorEmail,
        email_type: 'seat_purchase_confirmation',
        status: 'sending',
        template_name: 'seat-purchase-confirmation',
        template_data: { organizationName, quantity, amountPaid }
      })
      .select('id')
      .single();

    // Send confirmation to coordinator
    const coordinatorResult = await resend.emails.send({
      from: "ProCannEdu <noreply@procannedu.com>",
      to: [coordinatorEmail],
      subject: `✅ Seat Purchase Confirmation - ${quantity} Seats`,
      html: coordinatorHtml,
    });

    // Update coordinator email log
    if (coordLogData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: coordinatorResult.data?.id ? 'sent' : 'failed',
          provider_id: coordinatorResult.data?.id,
          sent_at: new Date().toISOString(),
          error: coordinatorResult.error ? JSON.stringify(coordinatorResult.error) : null
        })
        .eq('id', coordLogData.id);
    }

    // Log admin email
    const { data: adminLogData } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: 'admin@procannedu.com',
        email_type: 'admin_notification',
        status: 'sending',
        template_name: 'seat-purchase-admin-notification',
        template_data: { organizationName, quantity, amountPaid, coordinatorEmail }
      })
      .select('id')
      .single();

    // Send notification to admin
    const adminHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>📊 New Seat Purchase</h2>
        <p><strong>Organization:</strong> ${organizationName}</p>
        <p><strong>Coordinator:</strong> ${coordinatorName} (${coordinatorEmail})</p>
        <p><strong>Seats Purchased:</strong> ${quantity}</p>
        <p><strong>Amount Paid:</strong> $${amountPaid}</p>
        <p><strong>Purchase ID:</strong> ${purchaseId}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <a href="https://www.procannedu.com/admin" 
           style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
          View in Admin Dashboard
        </a>
      </div>
    `;

    const adminResult = await resend.emails.send({
      from: "ProCannEdu <noreply@procannedu.com>",
      to: ["admin@procannedu.com"],
      subject: `📊 New Seat Purchase - ${organizationName}`,
      html: adminHtml,
    });

    // Update admin email log
    if (adminLogData?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: adminResult.data?.id ? 'sent' : 'failed',
          provider_id: adminResult.data?.id,
          sent_at: new Date().toISOString(),
          error: adminResult.error ? JSON.stringify(adminResult.error) : null
        })
        .eq('id', adminLogData.id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      coordinatorEmailSent: !!coordinatorResult.data?.id,
      adminEmailSent: !!adminResult.data?.id
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
