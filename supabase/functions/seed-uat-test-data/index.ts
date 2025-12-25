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
    const { organizationId, runId, createSecondOrg } = await req.json();

    if (!organizationId) {
      throw new Error("organizationId is required");
    }

    console.log("[seed-uat-test-data] Starting comprehensive E2E seed for org:", organizationId);

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
      .select("id, title")
      .ilike("title", "%Maryland Responsible Vendor%")
      .limit(1)
      .maybeSingle();

    const courseId = course?.id;
    const seededData: Record<string, unknown[]> = {};

    // Get organization users
    const { data: orgUsers } = await supabase
      .from("profiles")
      .select("user_id, first_name, last_name, email")
      .eq("organization_id", organizationId)
      .limit(5);

    console.log(`[seed-uat-test-data] Found ${orgUsers?.length || 0} users in organization`);

    // ============================================
    // 1. Create test certificates (active, expired, revoked)
    // ============================================
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
        } else if (error) {
          console.log(`[seed-uat-test-data] Exam attempt error (may already exist):`, error.message);
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
          certificate_number: `UAT-CERT-${status.toUpperCase()}-${Date.now()}-${i}`,
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

    // ============================================
    // 2. Create supervisor signoffs (valid + to-be-invalidated)
    // ============================================
    if (orgUsers && orgUsers.length > 0 && courseId) {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id, version, title")
        .eq("course_id", courseId)
        .limit(3);

      if (modules && modules.length > 0) {
        const signoffs = [];
        
        // Valid signoff (current version)
        if (orgUsers.length > 0) {
          signoffs.push({
            organization_id: organizationId,
            employee_user_id: orgUsers[0].user_id,
            supervisor_user_id: orgUsers[0].user_id,
            module_id: modules[0].id,
            module_version: modules[0].version || 1,
            valid: true,
            signed_at: new Date().toISOString(),
            metadata: { uat_test: true, type: "valid_current_version" },
          });
        }

        // Signoff to be invalidated (old version - for version bump testing)
        if (orgUsers.length > 1 && modules.length > 1) {
          signoffs.push({
            organization_id: organizationId,
            employee_user_id: orgUsers[1].user_id,
            supervisor_user_id: orgUsers[0].user_id,
            module_id: modules[1].id,
            module_version: 1, // Old version
            valid: true,
            signed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            metadata: { uat_test: true, type: "pending_invalidation_on_version_bump" },
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

        // Update a module version to trigger invalidation testing
        if (modules.length > 1) {
          const { error: moduleError } = await supabase
            .from("course_modules")
            .update({ version: (modules[1].version || 1) + 1 })
            .eq("id", modules[1].id);

          if (!moduleError) {
            seededData.module_versions = [{ 
              module_id: modules[1].id, 
              old_version: modules[1].version || 1,
              new_version: (modules[1].version || 1) + 1 
            }];
            console.log("[seed-uat-test-data] Bumped module version for:", modules[1].id);
          }
        }
      }
    }

    // ============================================
    // 3. Create compliance incidents (for retraining trigger testing)
    // ============================================
    if (orgUsers && orgUsers.length > 0) {
      const incidents = [
        {
          organization_id: organizationId,
          employee_user_id: orgUsers[0].user_id,
          reported_by: orgUsers[0].user_id,
          incident_type: "minor_violation",
          description: "UAT Test - Minor policy violation (simulated for retraining trigger)",
          severity: "low" as const,
          status: "pending" as const,
          metadata: { uat_test: true, should_trigger_retraining: true },
        }
      ];

      // Add second incident if we have more users
      if (orgUsers.length > 1) {
        incidents.push({
          organization_id: organizationId,
          employee_user_id: orgUsers[1].user_id,
          reported_by: orgUsers[0].user_id,
          incident_type: "sale_to_minor",
          description: "UAT Test - Sale to minor (simulated - critical retraining required)",
          severity: "high" as const,
          status: "investigating" as const,
          metadata: { uat_test: true, should_trigger_retraining: true, critical: true },
        });
      }

      const { data: insertedIncidents, error: incidentError } = await supabase
        .from("compliance_incidents")
        .insert(incidents)
        .select();

      if (incidentError) {
        console.error("[seed-uat-test-data] Incident insert error:", incidentError);
      } else {
        seededData.incidents = insertedIncidents || [];
        console.log("[seed-uat-test-data] Seeded incidents:", insertedIncidents?.length);
      }
    }

    // ============================================
    // 4. Create course progress records (various states)
    // ============================================
    if (orgUsers && orgUsers.length > 0 && courseId) {
      const progressRecords = [
        // In-progress user
        {
          user_id: orgUsers[0].user_id,
          course_id: courseId,
          progress_percentage: 45,
          current_module: 2,
          started_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }
      ];

      // Nearly complete user
      if (orgUsers.length > 1) {
        progressRecords.push({
          user_id: orgUsers[1].user_id,
          course_id: courseId,
          progress_percentage: 90,
          current_module: 5,
          started_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      for (const progress of progressRecords) {
        const { data: progressData, error: progressError } = await supabase
          .from("course_progress")
          .upsert(progress, { onConflict: "user_id,course_id" })
          .select()
          .single();

        if (progressError) {
          console.error("[seed-uat-test-data] Progress insert error:", progressError);
        } else if (progressData) {
          seededData.course_progress = seededData.course_progress || [];
          (seededData.course_progress as unknown[]).push(progressData);
        }
      }
      console.log("[seed-uat-test-data] Seeded course progress:", seededData.course_progress?.length || 0);
    }

    // ============================================
    // 5. Create retraining events (for dashboard testing)
    // ============================================
    if (orgUsers && orgUsers.length > 0 && courseId) {
      const { data: modules } = await supabase
        .from("course_modules")
        .select("id")
        .eq("course_id", courseId)
        .limit(1)
        .single();

      if (modules) {
        const retrainingEvent = {
          organization_id: organizationId,
          employee_user_id: orgUsers[0].user_id,
          module_id: modules.id,
          reason: "UAT Test - Scheduled retraining for compliance incident",
          triggered_by: "uat_seed",
          status: "pending",
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          metadata: { uat_test: true },
        };

        const { data: retraining, error: retrainingError } = await supabase
          .from("retraining_events")
          .insert(retrainingEvent)
          .select()
          .single();

        if (retrainingError) {
          console.error("[seed-uat-test-data] Retraining insert error:", retrainingError);
        } else {
          seededData.retraining_events = [retraining];
          console.log("[seed-uat-test-data] Seeded retraining event:", retraining?.id);
        }
      }
    }

    // ============================================
    // 6. Create scheduled reviews (for overdue testing)
    // ============================================
    const scheduledReviews = [
      {
        organization_id: organizationId,
        review_type: "quarterly_compliance",
        due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Overdue
        status: "pending",
        metadata: { uat_test: true, should_show_overdue: true },
      },
      {
        organization_id: organizationId,
        review_type: "annual_audit_prep",
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Upcoming
        status: "scheduled",
        metadata: { uat_test: true },
      }
    ];

    const { data: reviews, error: reviewError } = await supabase
      .from("scheduled_reviews")
      .insert(scheduledReviews)
      .select();

    if (reviewError) {
      console.error("[seed-uat-test-data] Scheduled review insert error:", reviewError);
    } else {
      seededData.scheduled_reviews = reviews || [];
      console.log("[seed-uat-test-data] Seeded scheduled reviews:", reviews?.length);
    }

    // ============================================
    // 7. Create second test organization (for RLS/tenant isolation testing)
    // ============================================
    if (createSecondOrg) {
      const { data: secondOrg, error: secondOrgError } = await supabase
        .from("organizations")
        .insert({
          name: `UAT Isolation Test Org - ${Date.now()}`,
          admin_approved: true,
          metadata: { uat_test: true, purpose: "tenant_isolation_testing" },
        })
        .select()
        .single();

      if (secondOrgError) {
        console.error("[seed-uat-test-data] Second org creation error:", secondOrgError);
      } else {
        seededData.second_organization = [secondOrg];
        console.log("[seed-uat-test-data] Created second org for RLS testing:", secondOrg?.id);
      }
    }

    // ============================================
    // 8. Log the seeding in UAT run
    // ============================================
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
              retraining_events: seededData.retraining_events?.length || 0,
              scheduled_reviews: seededData.scheduled_reviews?.length || 0,
              second_organization: seededData.second_organization?.length || 0,
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
          course_progress: seededData.course_progress?.length || 0,
          retraining_events: seededData.retraining_events?.length || 0,
          scheduled_reviews: seededData.scheduled_reviews?.length || 0,
        },
      },
    });

    console.log("[seed-uat-test-data] Comprehensive E2E seeding complete:", seededData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "UAT E2E test data seeded successfully",
        data: seededData,
        summary: {
          certificates: seededData.certificates?.length || 0,
          signoffs: seededData.signoffs?.length || 0,
          incidents: seededData.incidents?.length || 0,
          course_progress: seededData.course_progress?.length || 0,
          retraining_events: seededData.retraining_events?.length || 0,
          scheduled_reviews: seededData.scheduled_reviews?.length || 0,
          module_versions_bumped: seededData.module_versions?.length || 0,
          second_org_created: createSecondOrg ? 1 : 0,
        }
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
