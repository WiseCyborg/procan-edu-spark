import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";
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
    console.log("Testing email providers...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results = {
      resend: { status: "offline", responseTime: 0, error: null as string | null },
      smtp: { status: "offline", responseTime: 0, error: null as string | null },
    };

    // Test Resend
    try {
      const resendStartTime = Date.now();
      const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
      
      // Simple test - just verify API key works
      await resend.emails.send({
        from: "ProCann Edu <noreply@procannedu.com>",
        to: ["test@resend.dev"], // Resend test address
        subject: "Health Check",
        html: "<p>Provider health check test</p>",
      });

      const resendResponseTime = Date.now() - resendStartTime;
      results.resend = {
        status: resendResponseTime < 1000 ? "online" : resendResponseTime < 3000 ? "degraded" : "slow",
        responseTime: resendResponseTime,
        error: null,
      };

      // Update database
      await supabase
        .from("email_provider_health")
        .upsert({
          provider_name: "resend",
          status: results.resend.status,
          response_time_ms: resendResponseTime,
          last_check_at: new Date().toISOString(),
          last_success_at: new Date().toISOString(),
          error_message: null,
        }, {
          onConflict: "provider_name",
        });

      console.log("Resend test successful:", resendResponseTime, "ms");
    } catch (error: any) {
      console.error("Resend test failed:", error);
      results.resend.error = error.message;
      results.resend.status = "offline";

      await supabase
        .from("email_provider_health")
        .upsert({
          provider_name: "resend",
          status: "offline",
          response_time_ms: 0,
          last_check_at: new Date().toISOString(),
          error_message: error.message,
        }, {
          onConflict: "provider_name",
        });
    }

    // Test SMTP
    try {
      const smtpStartTime = Date.now();
      const smtpService = new SMTPEmailService();
      const testResult = await smtpService.testConnection();
      await smtpService.close();

      const smtpResponseTime = testResult.latencyMs || (Date.now() - smtpStartTime);
      
      if (testResult.success) {
        results.smtp = {
          status: smtpResponseTime < 1000 ? "online" : smtpResponseTime < 3000 ? "degraded" : "slow",
          responseTime: smtpResponseTime,
          error: null,
        };

        await supabase
          .from("email_provider_health")
          .upsert({
            provider_name: "smtp",
            status: results.smtp.status,
            response_time_ms: smtpResponseTime,
            last_check_at: new Date().toISOString(),
            last_success_at: new Date().toISOString(),
            error_message: null,
          }, {
            onConflict: "provider_name",
          });

        console.log("SMTP test successful:", smtpResponseTime, "ms");
      } else {
        throw new Error(testResult.error || "SMTP test failed");
      }
    } catch (error: any) {
      console.error("SMTP test failed:", error);
      results.smtp.error = error.message;
      results.smtp.status = "offline";

      await supabase
        .from("email_provider_health")
        .upsert({
          provider_name: "smtp",
          status: "offline",
          response_time_ms: 0,
          last_check_at: new Date().toISOString(),
          error_message: error.message,
        }, {
          onConflict: "provider_name",
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Provider test error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
