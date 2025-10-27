import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailRouter } from "../_shared/email-router.ts";

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

    // Send confirmation to coordinator using EmailRouter
    const router = new EmailRouter();
    const coordinatorResult = await router.sendWithFailover({
      to: coordinatorEmail,
      subject: `✅ Seat Purchase Confirmation - ${quantity} Seats`,
      html: coordinatorHtml,
      from: "ProCannEdu <noreply@procannedu.com>",
      metadata: { email_type: 'seat_purchase_confirmation', log_id: coordLogData?.id }
    }, supabase);

    // Send admin notification
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

    const adminResult = await router.sendWithFailover({
      to: "admin@procannedu.com",
      subject: `📊 New Seat Purchase - ${organizationName}`,
      html: adminHtml,
      from: "ProCannEdu <noreply@procannedu.com>",
      metadata: { email_type: 'admin_notification', log_id: adminLogData?.id }
    }, supabase);

    return new Response(JSON.stringify({ 
      success: true,
      coordinatorEmailSent: coordinatorResult.success,
      adminEmailSent: adminResult.success,
      coordinatorProvider: coordinatorResult.provider,
      adminProvider: adminResult.provider
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
