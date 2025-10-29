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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get latest health snapshot
    const { data: latestSnapshot } = await supabase
      .from("system_health_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(1)
      .single();

    if (!latestSnapshot) {
      return new Response(
        JSON.stringify({ error: "No health snapshots available" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate comprehensive report
    const report = {
      title: "ProCann Edu - System Health Report",
      generated_at: new Date().toISOString(),
      reporting_period: "Last 24 Hours",
      
      executive_summary: {
        overall_health: latestSnapshot.overall_health_score,
        grade: latestSnapshot.overall_health_score >= 90 ? "A" : 
               latestSnapshot.overall_health_score >= 80 ? "B" : 
               latestSnapshot.overall_health_score >= 70 ? "C" : "D",
        status: latestSnapshot.overall_health_score >= 90 ? "Excellent" :
                latestSnapshot.overall_health_score >= 80 ? "Good" :
                latestSnapshot.overall_health_score >= 70 ? "Fair" : "Needs Attention",
      },

      component_health: latestSnapshot.component_scores,
      
      identified_gaps: latestSnapshot.gaps,
      
      recommendations: (latestSnapshot.gaps || []).map((gap: any) => ({
        priority: gap.severity === "high" ? "CRITICAL" : gap.severity === "medium" ? "HIGH" : "MEDIUM",
        component: gap.component,
        issue: `${gap.component} health at ${gap.health}%`,
        action: `Review and address ${gap.component} issues immediately`,
        estimated_effort: gap.severity === "high" ? "1-2 hours" : "30-60 minutes",
      })),

      test_results: latestSnapshot.test_results || {},
    };

    // Generate CSV format
    const csvLines = [
      "Component,Health Score,Status,Issues",
      ...Object.entries(latestSnapshot.component_scores).map(([component, data]: [string, any]) =>
        `${component},${data.health},${data.status},"${(data.issues || []).join('; ')}"`
      ),
    ];

    const csv = csvLines.join("\n");

    // Return JSON report with CSV embedded
    const response = {
      report,
      csv,
      download_url: null, // Could upload to storage and return URL
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Export health report error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
