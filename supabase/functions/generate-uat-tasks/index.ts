import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pre-built UAT task templates for compliance testing
const UAT_TASK_TEMPLATES = [
  {
    task_code: "CERT-01",
    title: "Verify expired certificate shows expired status",
    description: "Navigate to certificates page and verify that expired certificates display the correct 'Expired' badge and status",
    role_to_test: "employee",
    deep_link: "/certificates",
    expected_result: "Expired certificates show red 'Expired' badge, download is disabled, renewal prompt appears",
    priority: 10,
  },
  {
    task_code: "CERT-02",
    title: "Verify active certificate download works",
    description: "Attempt to download an active certificate and verify the PDF generates correctly with all required fields",
    role_to_test: "employee",
    deep_link: "/certificates",
    expected_result: "PDF downloads successfully with correct name, certificate number, issue date, and QR verification code",
    priority: 9,
  },
  {
    task_code: "CERT-03",
    title: "Test certificate revocation by admin",
    description: "As admin, revoke a certificate and verify it updates correctly and notifications are sent",
    role_to_test: "admin",
    deep_link: "/admin-management",
    expected_result: "Certificate status changes to 'Revoked', user is notified, certificate can no longer be verified",
    priority: 8,
  },
  {
    task_code: "SIGN-01",
    title: "Create supervisor signoff",
    description: "Navigate to signoffs section and create a new supervisor signoff for an employee",
    role_to_test: "dispensary_manager",
    deep_link: "/manager-dashboard/signoffs",
    expected_result: "Signoff is created successfully, appears in employee's record, is marked as valid",
    priority: 8,
  },
  {
    task_code: "SIGN-02",
    title: "Verify signoff invalidation on module update",
    description: "Update a course module version and verify that related signoffs are automatically invalidated",
    role_to_test: "admin",
    deep_link: "/admin-management",
    expected_result: "After module version bump, related signoffs show 'Invalid' status with reason 'Module updated to version X'",
    priority: 9,
  },
  {
    task_code: "RETRAIN-01",
    title: "Assign retraining to employee",
    description: "Create a retraining assignment for an employee and verify they receive notification",
    role_to_test: "dispensary_manager",
    deep_link: "/manager-dashboard",
    expected_result: "Retraining assignment created, employee sees retraining requirement in dashboard, previous signoffs invalidated",
    priority: 7,
  },
  {
    task_code: "INCIDENT-01",
    title: "Log incident and verify auto-retraining trigger",
    description: "Log a compliance incident and verify the system automatically triggers retraining for the involved employee",
    role_to_test: "dispensary_manager",
    deep_link: "/manager-dashboard/incidents",
    expected_result: "Incident logged successfully, edge function triggers retraining, employee notified, signoffs invalidated",
    priority: 10,
  },
  {
    task_code: "PACKET-01",
    title: "Export employee compliance packet",
    description: "Generate and download a compliance packet for an employee including all certificates, signoffs, and training records",
    role_to_test: "training_coordinator",
    deep_link: "/manager-dashboard/compliance",
    expected_result: "PDF packet generated with all employee compliance data, RLS prevents access to other org's data",
    priority: 6,
  },
  {
    task_code: "PAYMENT-01",
    title: "Complete PayPal sandbox checkout",
    description: "Initiate a seat purchase using PayPal sandbox and complete the payment flow",
    role_to_test: "dispensary_manager",
    deep_link: "/pricing",
    expected_result: "Redirected to PayPal sandbox, payment completes, redirected back to success page, no real charges",
    priority: 8,
  },
  {
    task_code: "PAYMENT-02",
    title: "Verify seats allocated after payment",
    description: "After completing a payment, verify that training seats are correctly allocated to the organization",
    role_to_test: "dispensary_manager",
    deep_link: "/manager-dashboard/seats",
    expected_result: "Seat count increases by purchased amount, seats show 'available' status, can be assigned to employees",
    priority: 7,
  },
  {
    task_code: "NOTIF-01",
    title: "Verify certificate expiry notification",
    description: "Check that expiring certificates trigger notification emails to the certificate holder",
    role_to_test: "admin",
    deep_link: "/admin-management/emails",
    expected_result: "30-day expiry warning email sent, email logged in communication_logs, correct template used",
    priority: 6,
  },
  {
    task_code: "AUDIT-01",
    title: "Mock MCA audit walkthrough",
    description: "Complete the full MCA compliance review checklist as if performing an actual audit",
    role_to_test: "admin",
    deep_link: "/mca-compliance-review",
    expected_result: "All sections can be completed, evidence can be attached, final report generates correctly",
    priority: 10,
  },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { runId, organizationId } = await req.json();

    if (!runId || !organizationId) {
      return new Response(
        JSON.stringify({ error: "runId and organizationId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the run exists and belongs to the organization
    const { data: run, error: runError } = await supabase
      .from("uat_runs")
      .select("id, organization_id")
      .eq("id", runId)
      .eq("organization_id", organizationId)
      .single();

    if (runError || !run) {
      return new Response(
        JSON.stringify({ error: "UAT run not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing tasks for this run (regeneration)
    await supabase
      .from("uat_tasks")
      .delete()
      .eq("run_id", runId);

    // Create tasks from templates
    const tasks = UAT_TASK_TEMPLATES.map((template) => ({
      ...template,
      run_id: runId,
      organization_id: organizationId,
      status: "todo",
    }));

    const { data: createdTasks, error: insertError } = await supabase
      .from("uat_tasks")
      .insert(tasks)
      .select();

    if (insertError) {
      console.error("Error inserting tasks:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create tasks", details: insertError }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generated ${createdTasks.length} UAT tasks for run ${runId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tasksCreated: createdTasks.length,
        tasks: createdTasks 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-uat-tasks:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
