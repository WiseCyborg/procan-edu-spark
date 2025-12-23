import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuditReportRequest {
  organization_id: string;
  start_date?: string;
  end_date?: string;
  include_incidents?: boolean;
  include_attestations?: boolean;
  include_trainer_certs?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { 
      organization_id, 
      start_date, 
      end_date,
      include_incidents = true,
      include_attestations = true,
      include_trainer_certs = true
    }: AuditReportRequest = await req.json();

    console.log(`[generate-mca-audit-report] Generating report for org: ${organization_id}`);

    const startDate = start_date || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = end_date || new Date().toISOString();

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organization_id)
      .single();

    if (orgError) throw orgError;

    // Get all employees
    const { data: employees, error: empError } = await supabase
      .from("profiles")
      .select(`
        user_id,
        first_name,
        last_name,
        email_cache,
        job_title,
        job_role,
        created_at,
        first_shift_date,
        training_verified_at,
        training_verified_by
      `)
      .eq("organization_id", organization_id);

    if (empError) throw empError;

    // Get certificates for all employees
    const employeeIds = employees?.map(e => e.user_id) || [];
    
    const { data: certificates, error: certError } = await supabase
      .from("certificates")
      .select(`
        id,
        user_id,
        certificate_number,
        issue_date,
        expiry_date,
        certification_level,
        tier_badge,
        is_revoked,
        course_id,
        courses (title)
      `)
      .in("user_id", employeeIds)
      .gte("issue_date", startDate)
      .lte("issue_date", endDate);

    if (certError) throw certError;

    // Get training progress
    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select(`
        user_id,
        module_id,
        completed,
        completed_at,
        quiz_score,
        curriculum_version_id,
        course_modules (title, module_number)
      `)
      .in("user_id", employeeIds);

    if (progressError) throw progressError;

    // Get attestations if requested
    let attestations = [];
    if (include_attestations) {
      const { data: attData, error: attError } = await supabase
        .from("module_attestations")
        .select(`
          id,
          user_id,
          module_id,
          attestation_type,
          attested_at,
          ip_address,
          course_modules (title, module_number)
        `)
        .in("user_id", employeeIds)
        .gte("attested_at", startDate)
        .lte("attested_at", endDate);

      if (!attError) attestations = attData || [];
    }

    // Get incidents if requested
    let incidents = [];
    if (include_incidents) {
      const { data: incData, error: incError } = await supabase
        .from("compliance_incidents")
        .select(`
          id,
          incident_type,
          severity,
          status,
          description,
          reported_at,
          resolved_at,
          resolution_notes,
          employee_user_id
        `)
        .eq("organization_id", organization_id)
        .gte("reported_at", startDate)
        .lte("reported_at", endDate);

      if (!incError) incidents = incData || [];
    }

    // Get retraining assignments
    const { data: retraining, error: retrainError } = await supabase
      .from("incident_retraining_assignments")
      .select(`
        id,
        user_id,
        incident_id,
        module_id,
        status,
        assigned_at,
        completed_at,
        course_modules (title)
      `)
      .in("user_id", employeeIds);

    // Get trainer certifications if requested
    let trainerCerts = [];
    if (include_trainer_certs) {
      const { data: trainerData, error: trainerError } = await supabase
        .from("trainer_certifications")
        .select(`
          id,
          user_id,
          certification_type,
          issued_at,
          expires_at,
          is_active,
          certified_by
        `)
        .in("user_id", employeeIds);

      if (!trainerError) trainerCerts = trainerData || [];
    }

    // Get supervisor signoffs with validity tracking
    const { data: signoffs, error: signoffError } = await supabase
      .from("supervisor_signoffs")
      .select(`
        id,
        employee_user_id,
        supervisor_user_id,
        competency_area,
        signed_off_at,
        notes,
        is_floor_observation,
        observation_date,
        module_id,
        module_version,
        valid,
        invalidated_at,
        invalidation_reason
      `)
      .eq("organization_id", organization_id);

    // Get retraining events
    const { data: retrainingEvents, error: retrainEventsError } = await supabase
      .from("retraining_events")
      .select(`
        id,
        employee_user_id,
        module_id,
        reason,
        incident_id,
        created_at,
        course_modules (title)
      `)
      .eq("organization_id", organization_id);

    // Get scheduled reviews
    const { data: reviews, error: reviewError } = await supabase
      .from("scheduled_reviews")
      .select("*")
      .eq("organization_id", organization_id)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    // Calculate summary statistics
    const totalEmployees = employees?.length || 0;
    const certifiedEmployees = new Set(certificates?.filter(c => !c.is_revoked).map(c => c.user_id)).size;
    const incidentCount = incidents.length;
    const resolvedIncidents = incidents.filter((i: any) => i.status === 'resolved').length;
    const completedReviews = reviews?.filter(r => r.status === 'completed').length || 0;

    // Build the audit report
    const auditReport = {
      generated_at: new Date().toISOString(),
      report_period: {
        start: startDate,
        end: endDate
      },
      organization: {
        id: org.id,
        name: org.name,
        license_number: org.license_number,
        address: org.address,
        admin_approved: org.admin_approved
      },
      summary: {
        total_employees: totalEmployees,
        certified_employees: certifiedEmployees,
        certification_rate: totalEmployees > 0 ? Math.round((certifiedEmployees / totalEmployees) * 100) : 0,
        total_incidents: incidentCount,
        resolved_incidents: resolvedIncidents,
        incident_resolution_rate: incidentCount > 0 ? Math.round((resolvedIncidents / incidentCount) * 100) : 100,
        scheduled_reviews: reviews?.length || 0,
        completed_reviews: completedReviews,
        trainer_count: trainerCerts.filter((t: any) => t.is_active).length
      },
      employees: employees?.map(emp => {
        const empCerts = certificates?.filter(c => c.user_id === emp.user_id) || [];
        const empProgress = progress?.filter(p => p.user_id === emp.user_id) || [];
        const empAttestations = attestations?.filter((a: any) => a.user_id === emp.user_id) || [];
        const empSignoffs = signoffs?.filter((s: any) => s.employee_user_id === emp.user_id) || [];
        const empRetraining = retraining?.filter(r => r.user_id === emp.user_id) || [];
        const empTrainerCert = trainerCerts.find((t: any) => t.user_id === emp.user_id);

        return {
          user_id: emp.user_id,
          name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
          email: emp.email_cache,
          job_title: emp.job_title,
          job_role: emp.job_role,
          hire_date: emp.created_at,
          first_shift_date: emp.first_shift_date,
          training_verified: emp.training_verified_at ? {
            verified_at: emp.training_verified_at,
            verified_by: emp.training_verified_by
          } : null,
          certificates: empCerts.map(c => ({
            number: c.certificate_number,
            course: (c as any).courses?.title,
            issued: c.issue_date,
            expires: c.expiry_date,
            level: c.certification_level,
            tier: c.tier_badge,
            revoked: c.is_revoked
          })),
          training_progress: {
            total_modules: empProgress.length,
            completed_modules: empProgress.filter(p => p.completed).length,
            average_score: empProgress.filter(p => p.quiz_score).length > 0
              ? Math.round(empProgress.filter(p => p.quiz_score).reduce((acc, p) => acc + (p.quiz_score || 0), 0) / empProgress.filter(p => p.quiz_score).length)
              : null
          },
          attestations: empAttestations.map((a: any) => ({
            module: a.course_modules?.title,
            type: a.attestation_type,
            date: a.attested_at
          })),
          supervisor_signoffs: empSignoffs.map((s: any) => ({
            competency: s.competency_area,
            signed_off_at: s.signed_off_at,
            floor_observation: s.is_floor_observation,
            observation_date: s.observation_date,
            valid: s.valid,
            invalidated_at: s.invalidated_at,
            invalidation_reason: s.invalidation_reason
          })),
          retraining_events: (retrainingEvents || [])
            .filter((r: any) => r.employee_user_id === emp.user_id)
            .map((r: any) => ({
              module: r.course_modules?.title,
              reason: r.reason,
              incident_id: r.incident_id,
              created_at: r.created_at
            })),
          retraining_assignments: empRetraining.map(r => ({
            module: (r as any).course_modules?.title,
            status: r.status,
            assigned: r.assigned_at,
            completed: r.completed_at
          })),
          is_trainer: !!empTrainerCert,
          trainer_certification: empTrainerCert ? {
            type: (empTrainerCert as any).certification_type,
            issued: (empTrainerCert as any).issued_at,
            expires: (empTrainerCert as any).expires_at,
            active: (empTrainerCert as any).is_active
          } : null
        };
      }),
      incidents: incidents.map((inc: any) => ({
        id: inc.id,
        type: inc.incident_type,
        severity: inc.severity,
        status: inc.status,
        description: inc.description,
        reported_at: inc.reported_at,
        resolved_at: inc.resolved_at,
        resolution_notes: inc.resolution_notes,
        employee_user_id: inc.employee_user_id
      })),
      compliance_reviews: reviews?.map(r => ({
        id: r.id,
        name: r.review_name,
        type: r.review_type,
        scheduled: r.scheduled_date,
        due: r.due_date,
        status: r.status,
        completed_at: r.completed_at,
        findings: r.findings
      })),
      comar_alignment: {
        note: "Training content aligned with COMAR 10.62.35 requirements",
        last_curriculum_update: "See curriculum_versions table for version history"
      }
    };

    console.log(`[generate-mca-audit-report] Report generated successfully`);

    return new Response(
      JSON.stringify(auditReport),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[generate-mca-audit-report] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
