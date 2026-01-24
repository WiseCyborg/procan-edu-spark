import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailService } from "../_shared/email-service.ts";
import { DOMAINS } from "../_shared/domains.ts";

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
      recipientEmail, 
      managerName, 
      organizationName, 
      seatsCount, 
      joinCode 
    } = await req.json();

    console.log('Sending team-ready email to:', recipientEmail);

    const html = await loadEmailTemplate('team-onboarding-ready', {
      ManagerName: managerName || 'Manager',
      ManagerEmail: recipientEmail,
      OrganizationName: organizationName,
      SeatsCount: seatsCount.toString(),
      JoinCode: joinCode,
      DashboardURL: `${DOMAINS.PRODUCTION}/dispensary-portal`
    });

    const emailService = new EmailService();
    const result = await emailService.send({
      to: recipientEmail,
      subject: `🎉 Your ${seatsCount} Training Seats Are Ready - Let's Enroll Your Team!`,
      html,
    });

    if (result.success) {
      console.log('✅ Team-ready email sent successfully');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      throw result.error;
    }
  } catch (error) {
    console.error("Error sending team-ready email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
