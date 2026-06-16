// resolve-duplicate-license (one-shot repair, per memory:operations/one-shot-repair-pattern)
//
// B2/B3 (2026-06-16): collapse two organizations that share a license number
// into one. Reparents all child rows from retire_org_id → keep_org_id and
// soft-deletes the retired org. Refuses to run if BOTH orgs have members
// (manual merge required).
//
// Auth: caller MUST be authenticated AND have role 'admin' or
// 'platform_admin' (validated server-side via has_role). Client-supplied
// roles are ignored.
//
// Body:
// {
//   license_number: string,
//   keep_org_id: uuid,
//   retire_org_id: uuid,
//   decision_owner: string,    // human name written to admin_operations_audit
//   confirm: true              // safety token; must be literally true
// }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error_code: "METHOD_NOT_ALLOWED" }, 405);

  // --- AuthN ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ success: false, error_code: "UNAUTHORIZED" }, 401);
  }

  const authClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json({ success: false, error_code: "UNAUTHORIZED" }, 401);
  }
  const caller = userData.user;

  const service = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // --- AuthZ: admin only ---
  const { data: isAdmin } = await service.rpc("has_role", {
    _user_id: caller.id,
    _role: "admin",
  });
  const { data: isPlatformAdmin } = await service.rpc("has_role", {
    _user_id: caller.id,
    _role: "platform_admin",
  });
  if (!isAdmin && !isPlatformAdmin) {
    return json({ success: false, error_code: "FORBIDDEN", error: "Admin role required" }, 403);
  }

  // --- Input ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error_code: "BAD_REQUEST", error: "Invalid JSON" }, 400);
  }
  const { license_number, keep_org_id, retire_org_id, decision_owner, confirm } = body ?? {};
  if (!license_number || !keep_org_id || !retire_org_id || !decision_owner) {
    return json({ success: false, error_code: "MISSING_FIELDS" });
  }
  if (confirm !== true) {
    return json({ success: false, error_code: "CONFIRM_REQUIRED", error: "Pass confirm: true" });
  }
  if (keep_org_id === retire_org_id) {
    return json({ success: false, error_code: "SAME_ORG" });
  }

  // --- Sanity: both orgs exist and share the license ---
  const { data: orgs, error: orgsErr } = await service
    .from("organizations")
    .select("id, name, license_number, is_active")
    .in("id", [keep_org_id, retire_org_id]);
  if (orgsErr) return json({ success: false, error_code: "DB_ERROR", error: orgsErr.message });
  if (!orgs || orgs.length !== 2) {
    return json({ success: false, error_code: "ORG_NOT_FOUND" });
  }
  const keep = orgs.find((o) => o.id === keep_org_id);
  const retire = orgs.find((o) => o.id === retire_org_id);
  if (!keep || !retire) return json({ success: false, error_code: "ORG_NOT_FOUND" });
  if (keep.license_number !== license_number || retire.license_number !== license_number) {
    return json({ success: false, error_code: "LICENSE_MISMATCH" });
  }

  // --- Safety: refuse if both orgs have members ---
  const { count: keepMembers } = await service
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", keep_org_id);
  const { count: retireMembers } = await service
    .from("organization_members")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", retire_org_id);
  if ((keepMembers ?? 0) > 0 && (retireMembers ?? 0) > 0) {
    return json({
      success: false,
      error_code: "BOTH_HAVE_MEMBERS",
      error: "Both organizations have members. Manual merge required.",
      keepMembers,
      retireMembers,
    });
  }

  // --- Reparent children ---
  const reparent = async (table: string) => {
    const { data, error } = await service
      .from(table)
      .update({ organization_id: keep_org_id })
      .eq("organization_id", retire_org_id)
      .select("id");
    if (error) throw new Error(`${table}: ${error.message}`);
    return data?.length ?? 0;
  };


  const moved: Record<string, number> = {};
  try {
    for (const t of [
      "organization_members",
      "rvt_purchases",
      "rvt_seats",
      "rvt_join_codes",
      "dispensary_applications",
      "staff_invitations",
      "org_invites",
    ]) {
      moved[t] = await reparent(t);
    }
  } catch (e) {
    return json({
      success: false,
      error_code: "REPARENT_FAILED",
      error: e instanceof Error ? e.message : String(e),
      moved,
    });
  }

  // --- Soft-delete retired org: deactivate + strip license so detector stops firing ---
  const { error: deactErr } = await service
    .from("organizations")
    .update({
      is_active: false,
      license_number: null,
      name: `${retire.name} [retired ${new Date().toISOString().slice(0, 10)}]`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", retire_org_id);
  if (deactErr) {
    return json({
      success: false,
      error_code: "DEACTIVATE_FAILED",
      error: deactErr.message,
      moved,
    });
  }

  // --- Audit ---
  await service.from("admin_operations_audit").insert({
    operation_type: "RESOLVE_DUPLICATE_LICENSE",
    performed_by: caller.id,
    target_type: "organization",
    target_id: retire_org_id,
    details: {
      license_number,
      keep_org_id,
      retire_org_id,
      decision_owner,
      moved,
      caller_email: caller.email,
    },
  });

  return json({
    success: true,
    license_number,
    keep_org_id,
    retire_org_id,
    decision_owner,
    moved,
    retired_org_renamed_to: `${retire.name} [retired ...]`,
  });
});
