import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const startTime = performance.now();
    const healthChecks: any = {};

    // 1. Database Health Check
    try {
      const dbStart = performance.now();
      const { data: courses, error: dbError } = await supabase
        .from("courses")
        .select("id")
        .limit(1);
      
      const dbLatency = Math.round(performance.now() - dbStart);
      healthChecks.database = {
        health: dbError ? 0 : 100,
        latency_ms: dbLatency,
        status: dbError ? "unhealthy" : "healthy",
        issues: dbError ? [dbError.message] : [],
      };
    } catch (error) {
      healthChecks.database = {
        health: 0,
        status: "unhealthy",
        issues: [error.message],
      };
    }

    // 2. Auth Health Check
    try {
      const authStart = performance.now();
      const { error: authError } = await supabase.auth.getSession();
      const authLatency = Math.round(performance.now() - authStart);
      
      healthChecks.auth = {
        health: authError ? 50 : 100,
        latency_ms: authLatency,
        status: authError ? "degraded" : "healthy",
      };
    } catch (error) {
      healthChecks.auth = {
        health: 0,
        status: "unhealthy",
      };
    }

    // 3. Storage Health Check
    try {
      const storageStart = performance.now();
      const { error: storageError } = await supabase.storage.listBuckets();
      const storageLatency = Math.round(performance.now() - storageStart);
      
      healthChecks.storage = {
        health: storageError ? 0 : 100,
        latency_ms: storageLatency,
        status: storageError ? "unhealthy" : "healthy",
      };
    } catch (error) {
      healthChecks.storage = {
        health: 0,
        status: "unhealthy",
      };
    }

    // 4. Email Integration Health
    try {
      const { data: emailLogs } = await supabase
        .from("email_logs")
        .select("status, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1000);

      const totalEmails = emailLogs?.length || 0;
      const successfulEmails = emailLogs?.filter(log => log.status === "sent").length || 0;
      const successRate = totalEmails > 0 ? (successfulEmails / totalEmails) * 100 : 100;

      healthChecks.email = {
        health: Math.round(successRate),
        success_rate: successRate.toFixed(2),
        total_24h: totalEmails,
        status: successRate >= 95 ? "healthy" : successRate >= 80 ? "degraded" : "unhealthy",
      };
    } catch (error) {
      healthChecks.email = {
        health: 50,
        status: "unknown",
      };
    }

    // 5. Certificate Generation Health
    try {
      const { data: certificates } = await supabase
        .from("certificates")
        .select("id, issue_date, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const totalCerts = certificates?.length || 0;
      const failedCerts = certificates?.filter(cert => !cert.issue_date).length || 0;
      const successRate = totalCerts > 0 ? ((totalCerts - failedCerts) / totalCerts) * 100 : 100;

      healthChecks.certificates = {
        health: Math.round(successRate),
        generated_24h: totalCerts,
        failed_24h: failedCerts,
        status: failedCerts === 0 ? "healthy" : "degraded",
      };
    } catch (error) {
      healthChecks.certificates = {
        health: 50,
        status: "unknown",
      };
    }

    // 6. Payment Integration Health
    try {
      const { data: payments } = await supabase
        .from("rvt_purchases")
        .select("id, payment_method, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const totalPayments = payments?.length || 0;
      
      healthChecks.payments = {
        health: 100,
        processed_24h: totalPayments,
        status: "healthy",
      };
    } catch (error) {
      healthChecks.payments = {
        health: 50,
        status: "unknown",
      };
    }

    // 7. Edge Functions Status
    try {
      const { data: functionStatus } = await supabase
        .from("edge_function_status")
        .select("function_name, is_deployed, last_check")
        .order("last_check", { ascending: false });

      const totalFunctions = functionStatus?.length || 0;
      const deployedFunctions = functionStatus?.filter(f => f.is_deployed).length || 0;
      const deploymentRate = totalFunctions > 0 ? (deployedFunctions / totalFunctions) * 100 : 100;

      healthChecks.functions = {
        health: Math.round(deploymentRate),
        total: totalFunctions,
        deployed: deployedFunctions,
        failed: totalFunctions - deployedFunctions,
        status: deploymentRate === 100 ? "healthy" : deploymentRate >= 90 ? "degraded" : "unhealthy",
      };
    } catch (error) {
      healthChecks.functions = {
        health: 50,
        status: "unknown",
      };
    }

    // 8. Security Status
    try {
      const { data: securityEvents } = await supabase
        .from("security_events")
        .select("severity, created_at")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      const criticalEvents = securityEvents?.filter(e => e.severity === "critical").length || 0;
      const highEvents = securityEvents?.filter(e => e.severity === "high").length || 0;

      healthChecks.security = {
        health: criticalEvents === 0 ? (highEvents === 0 ? 100 : 80) : 50,
        critical_events_24h: criticalEvents,
        high_events_24h: highEvents,
        status: criticalEvents > 0 ? "unhealthy" : highEvents > 0 ? "degraded" : "healthy",
      };
    } catch (error) {
      healthChecks.security = {
        health: 50,
        status: "unknown",
      };
    }

    // Calculate overall health score
    const healthScores = Object.values(healthChecks).map((check: any) => check.health || 0);
    const overallHealth = Math.round(
      healthScores.reduce((sum, score) => sum + score, 0) / healthScores.length
    );

    // Identify gaps
    const gaps = Object.entries(healthChecks)
      .filter(([_, check]: [string, any]) => check.health < 90)
      .map(([component, check]: [string, any]) => ({
        component,
        health: check.health,
        status: check.status,
        issues: check.issues || [],
        severity: check.health < 50 ? "high" : check.health < 80 ? "medium" : "low",
      }));

    const responseTime = Math.round(performance.now() - startTime);

    const report = {
      timestamp: new Date().toISOString(),
      overall_health: overallHealth,
      grade: overallHealth >= 90 ? "A" : overallHealth >= 80 ? "B" : overallHealth >= 70 ? "C" : "D",
      response_time_ms: responseTime,
      components: healthChecks,
      gaps,
      summary: {
        healthy_components: healthScores.filter(s => s >= 90).length,
        degraded_components: healthScores.filter(s => s >= 70 && s < 90).length,
        unhealthy_components: healthScores.filter(s => s < 70).length,
      },
    };

    // Store snapshot
    try {
      await supabase.from("system_health_snapshots").insert({
        overall_health_score: overallHealth,
        component_scores: healthChecks,
        gaps,
      });
    } catch (error) {
      console.error("Failed to store health snapshot:", error);
    }

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Comprehensive health check error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        overall_health: 0,
        status: "unhealthy",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
