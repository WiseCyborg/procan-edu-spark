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

    // Find applications with payment due in 7 or 3 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const { data: applications } = await supabase
      .from("dispensary_applications")
      .select("*")
      .eq("application_status", "approved")
      .is("payment_completed_at", null)
      .lte("registration_token_expires_at", sevenDaysFromNow.toISOString());

    if (!applications || applications.length === 0) {
      return new Response(JSON.stringify({ message: "No payment reminders to send" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const app of applications) {
      const expiryDate = new Date(app.registration_token_expires_at);
      const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Send reminder at 7 days or 3 days
      if (daysRemaining === 7 || daysRemaining === 3) {
        await supabase.functions.invoke("send-payment-reminder", {
          body: { application_id: app.id, days_remaining: daysRemaining },
        });
        sentCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, reminders_sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error checking payment deadlines:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
