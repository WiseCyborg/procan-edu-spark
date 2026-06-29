// Admin AI Reporting: NL → SQL → JSON results.
// Uses Anthropic Claude. Admin-only, read-only, hard 500-row cap.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SCHEMA_HINT = `
You are a PostgreSQL analyst for the ProCannEdu LMS (Supabase). Generate ONE
read-only SELECT query answering the user's question. Use ONLY these tables
and the columns you know to exist on them:

- courses(id, title, slug, track, is_active, created_at)
- course_modules(id, course_id, module_index, title, is_required, created_at)
- video_assets(id, asset_key, course_id, module_index, status, created_at)
- course_entitlements(id, user_id, course_id, source, status, granted_at, expires_at)
- course_progress(id, user_id, course_id, module_index, completed, completed_at, updated_at)
- exam_attempts(id, user_id, course_id, total_score, is_passed, submitted_at, created_at)
- certificates(id, user_id, course_id, certificate_number, issued_at)
- payment_events(id, user_id, amount, currency, status, provider, event_type, created_at)
- email_logs(id, recipient, template, status, error_message, sent_at, created_at)
- organizations(id, business_name, type, status, created_at)
- organization_members(id, organization_id, user_id, role, status, created_at)
- rvt_seats(id, organization_id, assigned_user_id, status, created_at)
- rvt_purchases(id, organization_id, seats_purchased, amount, status, created_at)
- profiles(user_id, first_name, last_name, email, created_at)

Rules:
- Output a SINGLE SELECT statement. No CTE writes, no DDL, no DML.
- No semicolons except optionally one at the end.
- Always add LIMIT 500 (or smaller) if the query could return many rows.
- Prefer aggregates and clear column aliases.
- If the question is ambiguous, choose the most useful interpretation.
- Return ONLY the SQL, no prose, no markdown fences.
`.trim();

function sanitizeSql(raw: string): { ok: true; sql: string } | { ok: false; error: string } {
  let sql = raw.trim();
  // Strip markdown fences if model added them
  sql = sql.replace(/^```(?:sql)?\s*/i, "").replace(/```\s*$/i, "").trim();
  // Strip trailing semicolons
  sql = sql.replace(/;+\s*$/g, "").trim();

  if (!sql) return { ok: false, error: "Empty SQL" };
  if (/;/.test(sql)) return { ok: false, error: "Multiple statements not allowed" };
  if (!/^select\b/i.test(sql) && !/^with\b/i.test(sql)) {
    return { ok: false, error: "Only SELECT queries are allowed" };
  }
  const forbidden = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|copy|vacuum|analyze|reindex|cluster|do|call|merge|refresh)\b/i;
  if (forbidden.test(sql)) {
    return { ok: false, error: "Write/DDL keywords are not allowed" };
  }
  // Enforce LIMIT 500
  if (!/\blimit\s+\d+/i.test(sql)) {
    sql = `${sql} LIMIT 500`;
  } else {
    sql = sql.replace(/\blimit\s+(\d+)/i, (_, n) => {
      const v = Math.min(parseInt(n, 10) || 500, 500);
      return `LIMIT ${v}`;
    });
  }
  return { ok: true, sql };
}

async function generateSql(question: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: SCHEMA_HINT,
      messages: [{ role: "user", content: question }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Anthropic error: ${res.status}`);
  }
  const text = data?.content?.[0]?.text ?? "";
  if (!text) throw new Error("Model returned no SQL");
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured. Add it in Project Settings → Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Admin check
    const { data: isAdminData, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdminData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { question } = await req.json();
    if (!question || typeof question !== "string" || question.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid question" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawSql = await generateSql(question, ANTHROPIC_API_KEY);
    const check = sanitizeSql(rawSql);
    if (!check.ok) {
      return new Response(
        JSON.stringify({ error: check.error, sql: rawSql }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const sql = check.sql;

    // Execute via exec_readonly_sql RPC (created by migration)
    const { data: execData, error: execErr } = await admin.rpc("exec_readonly_sql", {
      p_sql: sql,
    });

    if (execErr) {
      return new Response(
        JSON.stringify({ error: execErr.message, sql }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rowsJson = Array.isArray(execData) ? execData : [];
    const columns = rowsJson.length > 0 ? Object.keys(rowsJson[0] as Record<string, unknown>) : [];
    const rows = rowsJson.map((r) => columns.map((c) => (r as Record<string, unknown>)[c]));

    return new Response(JSON.stringify({ columns, rows, sql }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("admin-ai-report error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
