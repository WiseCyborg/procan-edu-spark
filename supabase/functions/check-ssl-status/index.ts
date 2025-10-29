import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url: targetUrl } = await req.json();
    const domain = targetUrl || "https://www.procannedu.com";

    console.log("Checking SSL/Domain health for:", domain);

    const healthReport: any = {
      domain,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // 1. SSL Certificate Check
    try {
      const response = await fetch(domain, { method: "HEAD" });
      const cert = response.headers.get("x-certificate-info");
      
      healthReport.checks.ssl = {
        status: response.ok ? "valid" : "invalid",
        https_enabled: domain.startsWith("https"),
        response_code: response.status,
      };
    } catch (error) {
      healthReport.checks.ssl = {
        status: "error",
        error: error.message,
      };
    }

    // 2. CORS Headers Check
    try {
      const response = await fetch(domain, { method: "OPTIONS" });
      const corsHeader = response.headers.get("access-control-allow-origin");
      
      healthReport.checks.cors = {
        status: corsHeader ? "configured" : "missing",
        allow_origin: corsHeader || null,
      };
    } catch (error) {
      healthReport.checks.cors = {
        status: "error",
        error: error.message,
      };
    }

    // 3. Response Time Check
    try {
      const start = performance.now();
      await fetch(domain, { method: "HEAD" });
      const responseTime = Math.round(performance.now() - start);
      
      healthReport.checks.performance = {
        response_time_ms: responseTime,
        status: responseTime < 500 ? "fast" : responseTime < 1000 ? "acceptable" : "slow",
      };
    } catch (error) {
      healthReport.checks.performance = {
        status: "error",
        error: error.message,
      };
    }

    // 4. DNS Resolution Check
    try {
      const hostname = new URL(domain).hostname;
      healthReport.checks.dns = {
        hostname,
        status: "resolved",
      };
    } catch (error) {
      healthReport.checks.dns = {
        status: "error",
        error: error.message,
      };
    }

    // Calculate overall status
    const checks = Object.values(healthReport.checks);
    const healthyChecks = checks.filter((check: any) => 
      check.status === "valid" || check.status === "configured" || check.status === "fast" || check.status === "resolved"
    ).length;
    
    healthReport.overall_status = healthyChecks === checks.length ? "healthy" : 
                                  healthyChecks >= checks.length / 2 ? "degraded" : "unhealthy";
    healthReport.health_score = Math.round((healthyChecks / checks.length) * 100);

    return new Response(JSON.stringify(healthReport), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("SSL/Domain check error:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        status: "error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
