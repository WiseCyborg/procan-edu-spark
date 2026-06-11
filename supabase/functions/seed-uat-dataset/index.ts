// Admin-only one-shot UAT dataset seeder.
// Creates a realistic test organization with 3 employees in different
// training states so the platform isn't empty when Dani and Louis test.
// Every row created is registered in public.uat_seed_entities so it can be
// purged with one click via purge-uat-seed-dataset.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const SEED_PASSWORD = "UATTester2026!";
const SEED_BATCH = `sunday-${new Date().toISOString().slice(0, 10)}`;

const EMPLOYEES = [
  { email: "jordan.reyes@sunrise-wellness-uat.com", first: "Jordan",  last: "Reyes",  state: "mid_training" },
  { email: "morgan.chen@sunrise-wellness-uat.com",  first: "Morgan",  last: "Chen",   state: "certified" },
  { email: "alex.parker@sunrise-wellness-uat.com",  first: "Alex",    last: "Parker", state: "expired" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const srk = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ success: false, error_code: "not_authenticated" }, 401);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json({ success: false, error_code: "not_authenticated" }, 401);

    const admin = createClient(url, srk);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!roles?.some((r: any) => r.role === "admin")) {
      return json({ success: false, error_code: "not_authorized" }, 200);
    }

    const log: Array<{ step: string; ok: boolean; detail?: unknown }> = [];
    const register = async (entity_table: string, entity_id: string, notes?: string) => {
      await admin.from("uat_seed_entities").insert({ entity_table, entity_id, seed_batch: SEED_BATCH, notes });
    };

    // Find RVT course
    const { data: course } = await admin
      .from("courses").select("id, title").eq("title", "Maryland Responsible Vendor Training (RVT)").maybeSingle();
    if (!course) return json({ success: false, error_code: "rvt_course_missing" }, 200);
    log.push({ step: "find_course", ok: true, detail: course.id });

    // 1. Create organization
    const { data: org, error: orgErr } = await admin.from("organizations").insert({
      name: "Sunrise Wellness MD",
      contact_person: "Daniel Hendricks",
      contact_email: "manager@sunrise-wellness-uat.com",
      contact_phone: "410-555-0142",
      address: "1200 Light St, Baltimore, MD 21230",
      license_number: "UAT-DEMO-001",
      is_active: true,
      admin_approved: true,
      payment_status: "paid",
      course_credits: 3,
      max_active_seats: 3,
      environment: "uat",
    }).select("id").single();
    if (orgErr || !org) return json({ success: false, error_code: "org_create_failed", message: orgErr?.message }, 200);
    await register("organizations", org.id, "Sunrise Wellness MD");
    log.push({ step: "create_org", ok: true, detail: org.id });

    // 2. Create rvt_purchase + 3 seats
    const { data: purchase, error: purErr } = await admin.from("rvt_purchases").insert({
      organization_id: org.id,
      course_id: course.id,
      quantity: 3,
      total_amount_cents: 14997,
      status: "completed",
    }).select("id").single();
    if (purErr || !purchase) return json({ success: false, error_code: "purchase_failed", message: purErr?.message }, 200);
    await register("rvt_purchases", purchase.id);
    log.push({ step: "create_purchase", ok: true });

    const seatIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const { data: seat, error: seatErr } = await admin.from("rvt_seats").insert({
        purchase_id: purchase.id,
        organization_id: org.id,
        course_id: course.id,
        status: "available",
      }).select("id").single();
      if (seatErr || !seat) return json({ success: false, error_code: "seat_failed", message: seatErr?.message }, 200);
      seatIds.push(seat.id);
      await register("rvt_seats", seat.id);
    }
    log.push({ step: "create_seats", ok: true, detail: seatIds });

    // 3. Create 3 employees
    const created: any[] = [];
    for (let i = 0; i < EMPLOYEES.length; i++) {
      const e = EMPLOYEES[i];
      const { data: userData, error: userErr } = await admin.auth.admin.createUser({
        email: e.email,
        password: SEED_PASSWORD,
        email_confirm: true,
        user_metadata: { first_name: e.first, last_name: e.last, is_uat_account: true },
      });
      if (userErr || !userData.user) {
        log.push({ step: `create_user_${e.email}`, ok: false, detail: userErr?.message });
        continue;
      }
      const uid = userData.user.id;
      await register("auth.users", uid, e.email);

      await admin.from("profiles").insert({
        user_id: uid, first_name: e.first, last_name: e.last,
        email_cache: e.email, organization_id: org.id, phone: "555-UAT-0000",
      });
      await admin.from("user_roles").insert({ user_id: uid, role: "student" });
      await admin.from("organization_members").insert({
        organization_id: org.id, user_id: uid, email: e.email, role: "employee",
        status: "active", member_type: "employee",
      });

      // Assign seat (triggers create course_entitlement automatically per memory)
      await admin.from("rvt_seats").update({
        status: "assigned", assigned_user_id: uid, assigned_at: new Date().toISOString(),
      }).eq("id", seatIds[i]);

      created.push({ uid, ...e });
    }
    log.push({ step: "create_employees", ok: true, detail: created.length });

    // 4. State-specific data
    const certified = created.find((c) => c.state === "certified");
    const expired = created.find((c) => c.state === "expired");

    if (certified) {
      // Exam attempt (passed)
      const { data: attempt } = await admin.from("exam_attempts").insert({
        user_id: certified.uid, course_id: course.id,
        total_score: 92, passed: true, status: "completed",
        started_at: new Date(Date.now() - 86400000).toISOString(),
        completed_at: new Date(Date.now() - 82800000).toISOString(),
      }).select("id").single();
      if (attempt) await register("exam_attempts", attempt.id);

      // Completion
      const { data: comp } = await admin.from("course_completions").insert({
        user_id: certified.uid, course_id: course.id,
        completion_percent: 100, passed: true,
      }).select("id").single();
      if (comp) await register("course_completions", comp.id);

      // Certificate
      const certNum = `RVT-UAT-${Date.now().toString().slice(-6)}`;
      const { data: cert } = await admin.from("certificates").insert({
        user_id: certified.uid, course_id: course.id,
        exam_attempt_id: attempt?.id ?? null,
        certificate_number: certNum,
        issue_date: new Date(Date.now() - 82800000).toISOString(),
        expiry_date: new Date(Date.now() + 365 * 86400000).toISOString(),
        status: "active", tier_badge: "green",
      }).select("id").single();
      if (cert) await register("certificates", cert.id);
      log.push({ step: "certified_employee", ok: true });
    }

    if (expired) {
      const { data: attempt } = await admin.from("exam_attempts").insert({
        user_id: expired.uid, course_id: course.id,
        total_score: 85, passed: true, status: "completed",
        started_at: new Date(Date.now() - 400 * 86400000).toISOString(),
        completed_at: new Date(Date.now() - 400 * 86400000).toISOString(),
      }).select("id").single();
      if (attempt) await register("exam_attempts", attempt.id);

      const { data: comp } = await admin.from("course_completions").insert({
        user_id: expired.uid, course_id: course.id,
        completion_percent: 100, passed: true,
        completed_at: new Date(Date.now() - 400 * 86400000).toISOString(),
      }).select("id").single();
      if (comp) await register("course_completions", comp.id);

      const certNum = `RVT-UATEXP-${Date.now().toString().slice(-6)}`;
      const { data: cert } = await admin.from("certificates").insert({
        user_id: expired.uid, course_id: course.id,
        exam_attempt_id: attempt?.id ?? null,
        certificate_number: certNum,
        issue_date: new Date(Date.now() - 400 * 86400000).toISOString(),
        expiry_date: new Date(Date.now() - 35 * 86400000).toISOString(),
        status: "expired", tier_badge: "red",
      }).select("id").single();
      if (cert) await register("certificates", cert.id);
      log.push({ step: "expired_employee", ok: true });
    }

    return json({
      success: true, batch: SEED_BATCH,
      organization_id: org.id,
      employees: created.map((c) => ({ email: c.email, state: c.state, password: SEED_PASSWORD })),
      log,
    });
  } catch (err: any) {
    console.error("seed-uat-dataset error", err);
    return json({ success: false, error_code: "internal_error", message: String(err?.message ?? err) }, 500);
  }
});
