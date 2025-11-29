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
    const { certificate_id, days_until_expiry } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: certificate } = await supabase
      .from("certificates")
      .select("*, profiles(first_name, last_name), auth.users(email)")
      .eq("id", certificate_id)
      .single();

    if (!certificate) throw new Error("Certificate not found");

    const html = await loadEmailTemplate("certificate-expiry-warning", {
      FirstName: certificate.profiles?.first_name || "",
      CertificateNumber: certificate.certificate_number,
      DaysUntilExpiry: days_until_expiry.toString(),
      ExpiryDate: new Date(certificate.expiry_date).toLocaleDateString(),
      RenewalURL: "https://www.procannedu.com/renew",
    });

    const emailService = new EmailService();
    const userEmail = certificate.auth?.users?.email || "";
    
    const result = await emailService.send({
      to: userEmail,
      subject: `⏰ Certificate Expires in ${days_until_expiry} Days`,
      html,
    });

    await supabase.from("email_logs").insert({
      recipient_email: userEmail,
      subject: `⏰ Certificate Expires in ${days_until_expiry} Days`,
      email_type: "certificate_expiry_warning",
      status: result.success ? "sent" : "failed",
      metadata: { certificate_id, days_until_expiry },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending certificate expiry warning:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
