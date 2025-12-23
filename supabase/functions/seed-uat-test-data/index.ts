import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  try {
    const { organizationId, runId } = await req.json();

    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    console.log("[seed-uat-test-data] Starting seed for org:", organizationId);

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      throw new Error(`Organization not found: ${organizationId}`);
    }

    // Get or create test course
    const { data: course } = await supabase
      .from("courses")
      .select("id")
      .ilike("title", "%Maryland Responsible Vendor%")
      .limit(1)
      .maybeSingle();

    const courseId = course?.id;
    const seededData: Record<string, unknown[]> = {};

    // 1. Create test certificates (active, expired, revoked)
    const { data: orgUsers } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name")
      .eq("organization_id", organizationId)
      .limit(3);

    if (orgUsers && orgUsers.length > 0 && courseId) {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoYearsFromNow = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);

      // First, create exam attempts for certificates
      const examAttempts = [];
      for (let i = 0; i < Math.min(3, orgUsers.length); i++) {
        const { data: attempt, error } = await supabase
          .from("exam_attempts")
          .insert({
            user_id: orgUsers[i].user_id,
            course_id: courseId,
            score: 85 + i * 5,
            passed: true,
            completed_at: new Date().toISOString(),
          })
          .select()
          .single();
        
        if (attempt) {
          examAttempts.push(attempt);
        }
      }

      const certificateStatuses = ["active", "expired", "revoked"];
      const certificates = [];

      for (let i = 0; i < Math.min(3, examAttempts.length); i++) {
        const status = certificateStatuses[i];
        let expiryDate = twoYearsFromNow;
        let isRevoked = false;

        if (status === "expired") {
          expiryDate = yesterday;
        } else if (status === "revoked") {
          isRevoked = true;
        }

        certificates.push({
          user_id: orgUsers[i].user_id,
          course_id: courseId,
          exam_attempt_id: examAttempts[i].id,
          certificate_number: `UAT-CERT-${status.toUpperCase()}-${Date.now()}`,
          issue_date: new Date().toISOString(),
          expiry_date: expiryDate.toISOString(),
          is_revoked: isRevoked,
          status: status,
          metadata: { uat_test: true, seeded_at: new Date().toISOString() },
        });
      }

      if (certificates.length > 0) {
        const { data: insertedCerts, error: certError } = await supabase
          .from("certificates")
          .insert(certificates)
          .select();

        if (certError) {
          console.error("[seed-uat-test-data] Certificate insert error:", certError);
        } else {
          seededData.certificates = insertedCerts || [];
          console.log("[seed-uat-test-data] Seeded certificates:", insertedCerts?.length);
        }
      }
    }

    // 2. Create test module versions for signoff testing
    if (courseId) {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("*")
        .eq("course_id", courseId)
        .limit(2);

      if (modules && modules.length > 0) {
        // Update first module to v2 for testing signoff invalidation
        const { error: moduleError } = await supabase
          .from("course_modules")
          .update({ version: 2 })
          .eq("id", modules[0].id);

        if (!moduleError) {
          seededData.module_versions = [{ module_id: modules[0].id, version: 2 }];
          console.log("[seed-uat-test-data] Updated module version:", modules[0].id);
        }
      }
    }

    // 3. Create test supervisor signoffs
    if (orgUsers && orgUsers.length > 0 && courseId) {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id, version")
        .eq("course_id", courseId)
        .limit(2);

      if (modules && modules.length > 0) {
        const signoffs = [];
        
        // Valid signoff (current version)
        if (orgUsers.length > 0) {
          signoffs.push({
            organization_id: organizationId,
            employee_user_id: orgUsers[0].user_id,
            supervisor_user_id: orgUsers[0].user_id, // Self-signed for testing
            module_id: modules[0].id,
            module_version: modules[0].version || 1,
            valid: true,
            signed_at: new Date().toISOString(),
            metadata: { uat_test: true },
          });
        }

        // Signoff to be invalidated (old version)
        if (orgUsers.length > 1 && modules.length > 1) {
          signoffs.push({
            organization_id: organizationId,
            employee_user_id: orgUsers[1].user_id,
            supervisor_user_id: orgUsers[0].user_id,
            module_id: modules[1].id,
            module_version: 1,
            valid: true,
            signed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { uat_test: true, pending_invalidation: true },
          });
        }

        if (signoffs.length > 0) {
          const { data: insertedSignoffs, error: signoffError } = await supabase
            .from("supervisor_signoffs")
            .insert(signoffs)
            .select();

          if (signoffError) {
            console.error("[seed-uat-test-data] Signoff insert error:", signoffError);
          } else {
            seededData.signoffs = insertedSignoffs || [];
            console.log("[seed-uat-test-data] Seeded signoffs:", insertedSignoffs?.length);
          }
        }
      }
    }

    // 4. Create test compliance incident
    if (orgUsers && orgUsers.length > 0) {
      const { data: incident, error: incidentError } = await supabase
        .from("compliance_incidents")
        .insert({
          organization_id: organizationId,
          employee_user_id: orgUsers[0].user_id,
          reported_by: orgUsers[0].user_id,
          incident_type: "minor_violation",
          description: "UAT Test Incident - Employee sold product to minor (simulated)",
          severity: "medium",
          status: "pending",
          metadata: { uat_test: true, trigger_retraining: true },
        })
        .select()
        .single();

      if (incidentError) {
        console.error("[seed-uat-test-data] Incident insert error:", incidentError);
      } else {
        seededData.incidents = [incident];
        console.log("[seed-uat-test-data] Seeded incident:", incident?.id);
      }
    }

    // 5. Create course progress record (in progress)
    if (orgUsers && orgUsers.length > 0 && courseId) {
      const { data: progress, error: progressError } = await supabase
        .from("course_progress")
        .upsert({
          user_id: orgUsers[0].user_id,
          course_id: courseId,
          progress_percentage: 75,
          current_module: 3,
          started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,course_id" })
        .select()
        .single();

      if (progressError) {
        console.error("[seed-uat-test-data] Progress insert error:", progressError);
      } else {
        seededData.course_progress = [progress];
        console.log("[seed-uat-test-data] Seeded course progress");
      }
    }

    // 6. Log the seeding in UAT run if provided
    if (runId) {
      await supabase
        .from("uat_runs")
        .update({
          notes: JSON.stringify({
            seeded_at: new Date().toISOString(),
            seeded_counts: {
              certificates: seededData.certificates?.length || 0,
              signoffs: seededData.signoffs?.length || 0,
              incidents: seededData.incidents?.length || 0,
              course_progress: seededData.course_progress?.length || 0,
            },
          }),
        })
        .eq("id", runId);
    }

    // Log audit event
    await supabase.from("security_audit_log").insert({
      table_name: "uat_test_data",
      action_type: "DATA_SEEDED",
      new_values: {
        organization_id: organizationId,
        run_id: runId,
        seeded_counts: {
          certificates: seededData.certificates?.length || 0,
          signoffs: seededData.signoffs?.length || 0,
          incidents: seededData.incidents?.length || 0,
        },
      },
    });

    console.log("[seed-uat-test-data] Seeding complete:", seededData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "UAT test data seeded successfully",
        data: seededData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[seed-uat-test-data] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
