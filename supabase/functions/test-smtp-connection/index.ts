import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { SMTPEmailService } from "../_shared/smtp-email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Testing SMTP connection...");

    const emailService = new SMTPEmailService();
    const result = await emailService.testConnection();
    await emailService.close();

    console.log("SMTP test result:", result);

    return new Response(
      JSON.stringify({
        success: result.success,
        latencyMs: result.latencyMs,
        error: result.error,
        timestamp: new Date().toISOString(),
        message: result.success 
          ? "SMTP connection successful" 
          : "SMTP connection failed",
      }),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error testing SMTP connection:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
