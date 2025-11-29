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
    const { user_id, percentage } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, auth.users(email)")
      .eq("user_id", user_id)
      .single();

    if (!profile) throw new Error("User not found");

    const html = await loadEmailTemplate("employee-progress-milestone", {
      FirstName: profile.first_name,
      Percentage: percentage.toString(),
      ContinueURL: "https://www.procannedu.com/course",
    });

    const emailService = new EmailService();
    const userEmail = profile.auth?.users?.email || "";
    
    const result = await emailService.send({
      to: userEmail,
      subject: `🎯 ${percentage}% Complete - Keep Going!`,
      html,
    });

    await supabase.from("email_logs").insert({
      recipient_email: userEmail,
      subject: `🎯 ${percentage}% Complete - Keep Going!`,
      email_type: "progress_milestone",
      status: result.success ? "sent" : "failed",
      metadata: { user_id, percentage },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending progress milestone:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
