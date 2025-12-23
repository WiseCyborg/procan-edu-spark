import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    // Create admin client for service operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Create client with user's auth for RLS
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get requesting user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { organization_id, employee_user_id, range_days = 365 } = body ?? {};

    if (!organization_id || !employee_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: "organization_id and employee_user_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[export-employee-compliance-packet] Starting export for employee ${employee_user_id} in org ${organization_id}`);

    // Verify requester has permission (is in org and has manager role)
    const { data: requesterProfile } = await supabaseAdmin
      .from("profiles")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    const { data: requesterRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPermission = requesterRoles?.some(r => 
      ['admin', 'dispensary_manager', 'training_coordinator'].includes(r.role)
    );

    const isInOrg = requesterProfile?.organization_id === organization_id || 
      requesterRoles?.some(r => r.role === 'admin');

    if (!hasPermission || !isInOrg) {
      return new Response(
        JSON.stringify({ success: false, error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate date range
    const sinceDate = new Date(Date.now() - range_days * 24 * 60 * 60 * 1000).toISOString();

    // Fetch all compliance data in parallel
    const [
      profileRes,
      certRes,
      signoffRes,
      retrainRes,
      incidentRes,
      reviewsRes,
      progressRes,
    ] = await Promise.all([
      // Employee profile
      supabaseAdmin
        .from("profiles")
        .select("user_id, full_name, first_name, last_name, email_cache, organization_id, hire_date, created_at")
        .eq("user_id", employee_user_id)
        .eq("organization_id", organization_id)
        .maybeSingle(),

      // Certificates
      supabaseAdmin
        .from("certificates")
        .select("id, certificate_number, issue_date, expiry_date, is_revoked, status, course_id, certification_level, tier_badge")
        .eq("user_id", employee_user_id)
        .order("issue_date", { ascending: false }),

      // Supervisor signoffs
      supabaseAdmin
        .from("supervisor_signoffs")
        .select("id, signoff_date, supervisor_name, supervisor_role, competency_confirmed, comments, module_id, module_version, valid, invalidated_at, invalidation_reason")
        .eq("organization_id", organization_id)
        .eq("employee_user_id", employee_user_id)
        .order("signoff_date", { ascending: false }),

      // Retraining events
      supabaseAdmin
        .from("retraining_events")
        .select("id, module_id, reason, incident_id, created_at")
        .eq("organization_id", organization_id)
        .eq("employee_user_id", employee_user_id)
        .order("created_at", { ascending: false }),

      // Compliance incidents
      supabaseAdmin
        .from("compliance_incidents")
        .select("id, incident_type, severity, status, description, reported_at, resolved_at, resolution_notes")
        .eq("organization_id", organization_id)
        .eq("employee_user_id", employee_user_id)
        .gte("reported_at", sinceDate)
        .order("reported_at", { ascending: false }),

      // Scheduled reviews
      supabaseAdmin
        .from("scheduled_reviews")
        .select("id, review_type, review_name, scheduled_date, due_date, completed_at, completed_by, status, notes")
        .eq("organization_id", organization_id)
        .order("due_date", { ascending: false })
        .limit(20),

      // Course progress
      supabaseAdmin
        .from("course_progress")
        .select("id, course_id, progress_percentage, started_at, completed_at, current_module, status")
        .eq("user_id", employee_user_id)
        .order("started_at", { ascending: false }),
    ]);

    // Check for errors
    if (profileRes.error) throw new Error(`Profile fetch failed: ${profileRes.error.message}`);
    if (certRes.error) throw new Error(`Certificates fetch failed: ${certRes.error.message}`);
    if (signoffRes.error) throw new Error(`Signoffs fetch failed: ${signoffRes.error.message}`);
    if (retrainRes.error) throw new Error(`Retraining events fetch failed: ${retrainRes.error.message}`);
    if (incidentRes.error) throw new Error(`Incidents fetch failed: ${incidentRes.error.message}`);
    if (reviewsRes.error) throw new Error(`Reviews fetch failed: ${reviewsRes.error.message}`);
    if (progressRes.error) throw new Error(`Progress fetch failed: ${progressRes.error.message}`);

    // Get organization info
    const { data: orgData } = await supabaseAdmin
      .from("organizations")
      .select("name, license_number, address, contact_email")
      .eq("id", organization_id)
      .single();

    // Build compliance packet
    const packet = {
      meta: {
        organization_id,
        organization_name: orgData?.name || "Unknown",
        license_number: orgData?.license_number || null,
        employee_user_id,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
        range_days,
        version: "1.0",
        comar_reference: "COMAR 14.17.15.05",
      },
      employee: {
        ...profileRes.data,
        email: profileRes.data?.email_cache || null,
      },
      certificates: certRes.data || [],
      signoffs: {
        all: signoffRes.data || [],
        valid: (signoffRes.data || []).filter((s: any) => s.valid === true),
        invalidated: (signoffRes.data || []).filter((s: any) => s.valid === false),
      },
      retraining_events: retrainRes.data || [],
      incidents: incidentRes.data || [],
      scheduled_reviews: reviewsRes.data || [],
      training_progress: progressRes.data || [],
      summary: {
        total_certificates: certRes.data?.length || 0,
        active_certificates: certRes.data?.filter((c: any) => c.status === 'active').length || 0,
        expired_certificates: certRes.data?.filter((c: any) => c.status === 'expired').length || 0,
        total_signoffs: signoffRes.data?.length || 0,
        valid_signoffs: (signoffRes.data || []).filter((s: any) => s.valid === true).length,
        retraining_count: retrainRes.data?.length || 0,
        incident_count: incidentRes.data?.length || 0,
        resolved_incidents: incidentRes.data?.filter((i: any) => i.status === 'resolved').length || 0,
      },
    };

    console.log(`[export-employee-compliance-packet] Built packet with ${packet.summary.total_certificates} certificates, ${packet.summary.total_signoffs} signoffs`);

    // Store JSON in Storage bucket
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const storagePath = `org/${organization_id}/packets/${employee_user_id}/${timestamp}.json`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("compliance")
      .upload(storagePath, JSON.stringify(packet, null, 2), {
        contentType: "application/json",
        upsert: false,
      });

    if (uploadError) {
      console.error(`[export-employee-compliance-packet] Storage upload failed:`, uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Track export in compliance_packets table
    const { data: packetRecord, error: insertError } = await supabaseAdmin
      .from("compliance_packets")
      .insert({
        organization_id,
        employee_user_id,
        packet_type: "employee",
        storage_path: storagePath,
        file_name: `compliance_packet_${timestamp}.json`,
        created_by: user.id,
        metadata: { 
          range_days, 
          summary: packet.summary,
          comar_reference: packet.meta.comar_reference,
        },
      })
      .select("id")
      .single();

    if (insertError) {
      console.error(`[export-employee-compliance-packet] Failed to record packet:`, insertError);
      // Don't fail - file is already uploaded
    }

    // Generate signed URL for download (10 minute expiry)
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from("compliance")
      .createSignedUrl(storagePath, 600);

    if (signedUrlError) {
      console.error(`[export-employee-compliance-packet] Signed URL failed:`, signedUrlError);
      throw new Error(`Failed to create download link: ${signedUrlError.message}`);
    }

    console.log(`[export-employee-compliance-packet] Export complete, packet ID: ${packetRecord?.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        packet_id: packetRecord?.id || null,
        storage_path: storagePath,
        signed_url: signedUrlData.signedUrl,
        summary: packet.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error(`[export-employee-compliance-packet] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
