import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

interface UATTask {
  id: string;
  task_code: string;
  title: string;
  description: string | null;
  role_to_test: string | null;
  deep_link: string | null;
  expected_result: string | null;
  status: string;
  priority: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { runId, email, organizationId } = await req.json();

    if (!runId || !email) {
      return new Response(
        JSON.stringify({ error: "runId and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch run details
    const { data: run, error: runError } = await supabase
      .from("uat_runs")
      .select("run_code, status, started_at")
      .eq("id", runId)
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: "UAT run not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch organization name
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", organizationId)
      .single();

    // Fetch all tasks for this run
    const { data: tasks, error: tasksError } = await supabase
      .from("uat_tasks")
      .select("*")
      .eq("run_id", runId)
      .order("priority", { ascending: false })
      .order("task_code");

    if (tasksError) {
      console.error("Error fetching tasks:", tasksError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tasks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const typedTasks = tasks as UATTask[];

    // Calculate stats
    const stats = {
      total: typedTasks.length,
      todo: typedTasks.filter((t) => t.status === "todo").length,
      doing: typedTasks.filter((t) => t.status === "doing").length,
      done: typedTasks.filter((t) => t.status === "done").length,
      blocked: typedTasks.filter((t) => t.status === "blocked").length,
    };

    const pendingTasks = typedTasks.filter((t) => t.status === "todo" || t.status === "doing");
    const blockedTasks = typedTasks.filter((t) => t.status === "blocked");

    const baseUrl = "https://www.procannedu.com";

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UAT Digest - ${run.run_code}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #10B981, #059669); color: white; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; }
    .stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: #f3f4f6; padding: 12px 16px; border-radius: 8px; text-align: center; flex: 1; min-width: 80px; }
    .stat-value { font-size: 24px; font-weight: bold; color: #111; }
    .stat-label { font-size: 12px; color: #666; text-transform: uppercase; }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 18px; margin-bottom: 12px; color: #111; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
    .task { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .task-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .task-code { background: #e5e7eb; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 12px; }
    .task-role { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
    .task-title { font-weight: 600; margin-bottom: 8px; }
    .task-expected { font-size: 14px; color: #666; background: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 8px; }
    .task-link { display: inline-block; margin-top: 12px; background: #10B981; color: white; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 14px; }
    .blocked { border-left: 4px solid #ef4444; }
    .progress-bar { background: #e5e7eb; border-radius: 999px; height: 8px; margin: 16px 0; overflow: hidden; }
    .progress-fill { background: #10B981; height: 100%; transition: width 0.3s; }
    .footer { text-align: center; color: #666; font-size: 14px; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🧪 UAT Digest: ${run.run_code}</h1>
    <p>${org?.name || "Organization"} • ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${stats.total}</div>
      <div class="stat-label">Total</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #10B981;">${stats.done}</div>
      <div class="stat-label">Done</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #3B82F6;">${stats.doing}</div>
      <div class="stat-label">In Progress</div>
    </div>
    <div class="stat">
      <div class="stat-value" style="color: #6B7280;">${stats.todo}</div>
      <div class="stat-label">To Do</div>
    </div>
    ${stats.blocked > 0 ? `
    <div class="stat">
      <div class="stat-value" style="color: #EF4444;">${stats.blocked}</div>
      <div class="stat-label">Blocked</div>
    </div>
    ` : ""}
  </div>

  <div class="progress-bar">
    <div class="progress-fill" style="width: ${Math.round((stats.done / stats.total) * 100)}%;"></div>
  </div>
  <p style="text-align: center; color: #666; margin-bottom: 24px;">
    ${Math.round((stats.done / stats.total) * 100)}% Complete (${stats.done}/${stats.total} tasks)
  </p>

  ${blockedTasks.length > 0 ? `
  <div class="section">
    <h2>🚨 Blocked Tasks (${blockedTasks.length})</h2>
    ${blockedTasks.map((task) => `
      <div class="task blocked">
        <div class="task-header">
          <span class="task-code">${task.task_code}</span>
          ${task.role_to_test ? `<span class="task-role">Test as: ${task.role_to_test.replace("_", " ")}</span>` : ""}
        </div>
        <div class="task-title">${task.title}</div>
        ${task.description ? `<p style="color: #666; font-size: 14px; margin: 0;">${task.description}</p>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  <div class="section">
    <h2>📋 Today's Tasks (${pendingTasks.length} remaining)</h2>
    ${pendingTasks.slice(0, 6).map((task) => `
      <div class="task">
        <div class="task-header">
          <span class="task-code">${task.task_code}</span>
          ${task.role_to_test ? `<span class="task-role">Test as: ${task.role_to_test.replace("_", " ")}</span>` : ""}
        </div>
        <div class="task-title">${task.title}</div>
        ${task.description ? `<p style="color: #666; font-size: 14px; margin: 0;">${task.description}</p>` : ""}
        ${task.expected_result ? `
        <div class="task-expected">
          <strong>Expected:</strong> ${task.expected_result}
        </div>
        ` : ""}
        ${task.deep_link ? `<a href="${baseUrl}${task.deep_link}" class="task-link">Open Test Page →</a>` : ""}
      </div>
    `).join("")}
    ${pendingTasks.length > 6 ? `
    <p style="text-align: center; color: #666;">... and ${pendingTasks.length - 6} more tasks</p>
    ` : ""}
  </div>

  <div style="text-align: center; margin: 24px 0;">
    <a href="${baseUrl}/profile?tab=uat" style="display: inline-block; background: #111; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      View All Tasks in Dashboard →
    </a>
  </div>

  <div class="footer">
    <p>This is an automated UAT digest from ProCann Edu</p>
    <p>Run started: ${new Date(run.started_at).toLocaleDateString()}</p>
  </div>
</body>
</html>
    `;

    // Send email via Resend
    if (!RESEND_API_KEY) {
      console.log("RESEND_API_KEY not configured, logging email instead");
      console.log("Would send to:", email);
      console.log("Subject:", `UAT Digest: ${run.run_code} - ${stats.done}/${stats.total} Complete`);
      
      // Log to communication_logs even without sending
      await supabase.from("communication_logs").insert({
        communication_type: "uat_digest",
        recipient_email: email,
        subject: `UAT Digest: ${run.run_code}`,
        content: `UAT digest for run ${run.run_code}. Progress: ${stats.done}/${stats.total} tasks complete.`,
        delivery_status: "simulated",
        organization_id: organizationId,
        metadata: { run_id: runId, stats },
      });

      return new Response(
        JSON.stringify({ success: true, simulated: true, stats }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "ProCann Edu UAT <noreply@procannedu.com>",
        to: [email],
        subject: `UAT Digest: ${run.run_code} - ${stats.done}/${stats.total} Complete`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Resend error:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    // Log the email
    await supabase.from("communication_logs").insert({
      communication_type: "uat_digest",
      recipient_email: email,
      subject: `UAT Digest: ${run.run_code}`,
      content: `UAT digest for run ${run.run_code}. Progress: ${stats.done}/${stats.total} tasks complete.`,
      delivery_status: "sent",
      organization_id: organizationId,
      metadata: { run_id: runId, stats, resend_id: emailResult.id },
    });

    console.log(`UAT digest sent to ${email} for run ${run.run_code}`);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResult.id, stats }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-uat-digest:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
