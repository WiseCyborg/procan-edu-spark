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
    console.log("🔍 Starting comprehensive email system diagnostics...");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const diagnostics = {
      timestamp: new Date().toISOString(),
      secrets: {
        resend_api_key: !!Deno.env.get("RESEND_API_KEY"),
        smtp_hostname: !!Deno.env.get("SMTP_HOSTNAME"),
        smtp_username: !!Deno.env.get("SMTP_USERNAME"),
        smtp_password: !!Deno.env.get("SMTP_PASSWORD"),
        smtp_port: Deno.env.get("SMTP_PORT"),
        smtp_from: Deno.env.get("SMTP_FROM"),
      },
      circuitBreaker: null as any,
      providerHealth: null as any,
      recentEmails: null as any,
      resendTest: null as any,
      smtpTest: null as any,
      recommendations: [] as string[],
    };

    // Check circuit breaker
    const { data: cbData } = await supabase
      .from("email_circuit_breaker")
      .select("*")
      .single();
    
    diagnostics.circuitBreaker = cbData;

    // Check provider health
    const { data: phData } = await supabase
      .from("email_provider_health")
      .select("*")
      .order("last_check_at", { ascending: false })
      .limit(5);
    
    diagnostics.providerHealth = phData;

    // Check recent email stats
    const { data: emailStats } = await supabase
      .rpc("execute_sql", { 
        query: `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
            MAX(created_at) as last_attempt,
            (SELECT error_message FROM email_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 1) as last_error
          FROM email_logs
          WHERE created_at > NOW() - INTERVAL '7 days'
        `
      });
    
    diagnostics.recentEmails = emailStats;

    // Test Resend
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY") ?? "");
      const startTime = Date.now();
      
      const result = await resend.emails.send({
        from: "ProCann Edu <onboarding@resend.dev>", // Use Resend's test domain
        to: ["delivered@resend.dev"], // Resend's test inbox
        subject: "🔍 Email System Diagnostic Test",
        html: "<p>This is an automated diagnostic test. If you receive this, Resend is working.</p>",
      });

      diagnostics.resendTest = {
        success: !!result.data,
        responseTime: Date.now() - startTime,
        messageId: result.data?.id,
        error: result.error || null,
      };

      if (!result.data) {
        diagnostics.recommendations.push(
          "⚠️ Resend domain verification issue detected. Verify procannedu.com at https://resend.com/domains"
        );
      }
    } catch (error: any) {
      diagnostics.resendTest = {
        success: false,
        error: error.message,
      };
      diagnostics.recommendations.push(
        "❌ Resend API test failed: " + error.message
      );
    }

    // Test SMTP
    try {
      const smtpService = new SMTPEmailService();
      const smtpResult = await smtpService.testConnection();
      await smtpService.close();

      diagnostics.smtpTest = {
        success: smtpResult.success,
        responseTime: smtpResult.latencyMs,
        error: smtpResult.error || null,
      };

      if (!smtpResult.success) {
        diagnostics.recommendations.push(
          "⚠️ SMTP connection failed. Check SMTP credentials and hostname."
        );
      }
    } catch (error: any) {
      diagnostics.smtpTest = {
        success: false,
        error: error.message,
      };
      diagnostics.recommendations.push(
        "❌ SMTP test failed: " + error.message
      );
    }

    // Generate recommendations
    if (diagnostics.circuitBreaker?.circuit_state === 'open') {
      diagnostics.recommendations.push(
        "🚨 CRITICAL: Email circuit breaker is OPEN. Manual reset required."
      );
    }

    if (diagnostics.circuitBreaker?.failure_count > 0) {
      diagnostics.recommendations.push(
        `⚠️ Circuit breaker has ${diagnostics.circuitBreaker.failure_count} failures logged.`
      );
    }

    const failureRate = diagnostics.recentEmails?.[0]?.failed / (diagnostics.recentEmails?.[0]?.total || 1);
    if (failureRate > 0.5) {
      diagnostics.recommendations.push(
        `🚨 HIGH FAILURE RATE: ${(failureRate * 100).toFixed(0)}% of emails failed in last 7 days`
      );
    }

    if (!diagnostics.resendTest?.success && !diagnostics.smtpTest?.success) {
      diagnostics.recommendations.push(
        "🚨 CRITICAL: Both Resend AND SMTP are failing. Email system is DOWN."
      );
    } else if (!diagnostics.resendTest?.success) {
      diagnostics.recommendations.push(
        "✅ SMTP is working - will be used as fallback for failed Resend attempts"
      );
    }

    // Overall health status
    const overallHealth = 
      diagnostics.recommendations.some(r => r.includes("🚨 CRITICAL")) ? "CRITICAL" :
      diagnostics.recommendations.some(r => r.includes("⚠️")) ? "DEGRADED" :
      "HEALTHY";

    return new Response(
      JSON.stringify({
        health: overallHealth,
        diagnostics,
        summary: {
          resend_working: diagnostics.resendTest?.success,
          smtp_working: diagnostics.smtpTest?.success,
          circuit_breaker_state: diagnostics.circuitBreaker?.circuit_state,
          recent_failure_rate: `${((failureRate || 0) * 100).toFixed(1)}%`,
          last_email_sent: diagnostics.recentEmails?.[0]?.last_attempt,
        },
      }, null, 2),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("❌ Diagnostic error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
