import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailService } from "../_shared/email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { purchase_id, error_message } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: purchase } = await supabase
      .from("rvt_purchases")
      .select("*, organizations(*)")
      .eq("id", purchase_id)
      .single();

    if (!purchase) throw new Error("Purchase not found");

    const html = await loadEmailTemplate("payment-failed", {
      ContactPerson: purchase.organizations?.contact_person || "Customer",
      OrganizationName: purchase.organizations?.name || "",
      ErrorMessage: error_message || "Payment processing failed",
      RetryURL: `https://www.procannedu.com/payment/retry?purchase_id=${purchase_id}`,
    });

    const emailService = new EmailService();
    const result = await emailService.send({
      to: purchase.organizations?.contact_email || "",
      subject: "Payment Failed - Action Required",
      html,
    });

    await supabase.from("email_logs").insert({
      recipient_email: purchase.organizations?.contact_email,
      subject: "Payment Failed - Action Required",
      email_type: "payment_failed",
      delivery_status: result.success ? "sent" : "failed",
      metadata: { purchase_id, error_message },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending payment failed email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
