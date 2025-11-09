import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const { data: certificates } = await supabase
      .from("certificates")
      .select("*")
      .lte("expiry_date", ninetyDaysFromNow.toISOString())
      .eq("is_revoked", false);

    if (!certificates || certificates.length === 0) {
      return new Response(JSON.stringify({ message: "No expiry warnings to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const cert of certificates) {
      const expiryDate = new Date(cert.expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Send warnings at 90, 60, and 30 days
      if (daysUntilExpiry === 90 || daysUntilExpiry === 60 || daysUntilExpiry === 30) {
        await supabase.functions.invoke("send-certificate-expiry-warning", {
          body: { certificate_id: cert.id, days_until_expiry: daysUntilExpiry },
        });
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, warnings_sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error checking certificate expiry:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
