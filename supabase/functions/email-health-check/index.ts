import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const checks: Record<string, boolean> = {};
    const errors: string[] = [];

    // 1. Test diagnostic email function
    console.log("🔍 Testing diagnostic email...");
    try {
      const diagnosticResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/_diagnostic-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ to: "ops@procannedu.com" })
        }
      );
      checks.diagnostic_function = diagnosticResponse.ok;
      if (!diagnosticResponse.ok) {
        errors.push(`Diagnostic function failed: ${diagnosticResponse.status}`);
      }
    } catch (e: any) {
      checks.diagnostic_function = false;
      errors.push(`Diagnostic function error: ${e.message}`);
    }

    // 2. Check email_logs for recent activity (last hour)
    console.log("🔍 Checking email_logs...");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentLogs, error: logsError } = await supabase
      .from('email_logs')
      .select('id, status, created_at')
      .gte('created_at', oneHourAgo);

    checks.email_logs_accessible = !logsError;
    if (logsError) {
      errors.push(`Email logs query failed: ${logsError.message}`);
    }

    // 3. Calculate success rate
    const totalEmails = recentLogs?.length || 0;
    const sentEmails = recentLogs?.filter(log => log.status === 'sent').length || 0;
    const successRate = totalEmails > 0 ? (sentEmails / totalEmails) * 100 : 100;
    checks.success_rate_healthy = successRate >= 95;
    
    if (successRate < 95) {
      errors.push(`Success rate below 95%: ${successRate.toFixed(1)}%`);
    }

    // 4. Check for stuck emails (queued/sending > 15 min)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { data: stuckEmails, error: stuckError } = await supabase
      .from('email_logs')
      .select('id, status, created_at')
      .in('status', ['queued', 'sending'])
      .lt('created_at', fifteenMinutesAgo);

    checks.no_stuck_emails = (stuckEmails?.length || 0) === 0;
    if (stuckEmails && stuckEmails.length > 0) {
      errors.push(`${stuckEmails.length} emails stuck in queue/sending`);
    }

    // 5. Check Resend API key exists
    checks.resend_api_key_configured = !!Deno.env.get("RESEND_API_KEY");
    if (!Deno.env.get("RESEND_API_KEY")) {
      errors.push("RESEND_API_KEY not configured");
    }

    // Overall health
    const allChecksPassed = Object.values(checks).every(v => v === true);
    const status = allChecksPassed ? "HEALTHY" : "DEGRADED";

    const report = {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        emails_last_hour: totalEmails,
        sent_emails: sentEmails,
        success_rate: `${successRate.toFixed(1)}%`,
        stuck_emails: stuckEmails?.length || 0,
      },
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log("📊 Health Check Report:", JSON.stringify(report, null, 2));

    return new Response(
      JSON.stringify(report),
      {
        status: allChecksPassed ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("❌ Health check failed:", error);
    return new Response(
      JSON.stringify({
        status: "FAILED",
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
