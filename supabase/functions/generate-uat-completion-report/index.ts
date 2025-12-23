import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UATCompletionReport {
  organizationId: string;
  organizationName: string;
  environment: string;
  generatedAt: string;
  generatedBy: string;
  attestation: {
    signed: boolean;
    signedAt: string | null;
    signedBy: string | null;
  };
  tasksSummary: {
    total: number;
    completed: number;
    passed: number;
    failed: number;
    pending: number;
  };
  evidenceItems: Array<{
    taskId: string;
    taskCode: string;
    taskTitle: string;
    status: string;
    evidence: string | null;
    completedAt: string | null;
  }>;
  productionReadiness: {
    ready: boolean;
    missingRequirements: string[];
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { organizationId, runId } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: "organizationId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating UAT completion report for org: ${organizationId}`);

    // Fetch organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch UAT run if provided, otherwise get latest
    let uatRun;
    if (runId) {
      const { data } = await supabase
        .from("uat_runs")
        .select("*")
        .eq("id", runId)
        .single();
      uatRun = data;
    } else {
      const { data } = await supabase
        .from("uat_runs")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      uatRun = data;
    }

    // Fetch UAT tasks
    const { data: tasks } = await supabase
      .from("uat_tasks")
      .select("*")
      .eq("run_id", uatRun?.id)
      .order("task_code");

    // Fetch UAT evidence
    const { data: evidence } = await supabase
      .from("uat_evidence")
      .select("*")
      .eq("run_id", uatRun?.id);

    // Calculate summary
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter(t => t.status === "completed").length || 0;
    const passedTasks = tasks?.filter(t => t.status === "completed").length || 0;
    const failedTasks = tasks?.filter(t => t.status === "blocked").length || 0;
    const pendingTasks = totalTasks - completedTasks - failedTasks;

    // Determine production readiness
    const missingRequirements: string[] = [];
    if (!org.admin_attestation_signed) {
      missingRequirements.push("Admin attestation not signed");
    }
    if (completedTasks < totalTasks) {
      missingRequirements.push(`${totalTasks - completedTasks} UAT tasks incomplete`);
    }
    if (failedTasks > 0) {
      missingRequirements.push(`${failedTasks} UAT tasks failed/blocked`);
    }

    // Build report
    const report: UATCompletionReport = {
      organizationId: org.id,
      organizationName: org.name,
      environment: org.environment || "production",
      generatedAt: new Date().toISOString(),
      generatedBy: user.email || user.id,
      attestation: {
        signed: org.admin_attestation_signed || false,
        signedAt: org.admin_attestation_signed_at,
        signedBy: org.admin_attestation_signed_by,
      },
      tasksSummary: {
        total: totalTasks,
        completed: completedTasks,
        passed: passedTasks,
        failed: failedTasks,
        pending: pendingTasks,
      },
      evidenceItems: (tasks || []).map(task => ({
        taskId: task.id,
        taskCode: task.task_code,
        taskTitle: task.title,
        status: task.status,
        evidence: task.completion_evidence,
        completedAt: task.completed_at,
      })),
      productionReadiness: {
        ready: missingRequirements.length === 0,
        missingRequirements,
      },
    };

    // Store report in compliance bucket
    const reportFileName = `uat-completion-report-${new Date().toISOString().split("T")[0]}.json`;
    const storagePath = `${organizationId}/uat-completion/${reportFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("compliance")
      .upload(storagePath, JSON.stringify(report, null, 2), {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      console.error("Failed to upload report:", uploadError);
    }

    // Create compliance packet record
    const { error: packetError } = await supabase
      .from("compliance_packets")
      .insert({
        organization_id: organizationId,
        packet_type: "uat_completion_report",
        storage_path: storagePath,
        file_name: reportFileName,
        created_by: user.id,
        metadata: {
          run_id: uatRun?.id,
          tasks_completed: completedTasks,
          production_ready: report.productionReadiness.ready,
        },
      });

    if (packetError) {
      console.error("Failed to create packet record:", packetError);
    }

    console.log(`UAT completion report generated: ${storagePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        report,
        storagePath,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating UAT completion report:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
