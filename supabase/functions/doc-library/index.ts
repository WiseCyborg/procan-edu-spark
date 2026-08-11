// Admin Document Library — list lineages/versions, issue signed PDF URLs,
// and accept operator uploads of the rendered PDFs.
// Admin-only. Read-only against the registry except for the ingest action,
// which writes only to the private `doc-library` bucket + version rows.
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "doc-library";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- authenticate caller ---
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // --- admin gate (same convention as the rest of the platform) ---
    const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (roleErr || !isAdmin) return json({ error: "Admin only" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = body?.action ?? "list";

    // ---------------- list ----------------
    if (action === "list") {
      const { data: docs, error: dErr } = await admin
        .from("doc_library_documents")
        .select("doc_key,title,category,relation_type,current_version,version_count,first_doc_date,last_doc_date")
        .order("category", { ascending: true })
        .order("title", { ascending: true });
      if (dErr) return json({ error: dErr.message }, 400);

      const { data: vers, error: vErr } = await admin
        .from("doc_library_versions")
        .select("doc_key,version,version_title,doc_date,pdf_path,md_sha256,source_path,source_bytes,pdf_bytes,is_current")
        .order("doc_key", { ascending: true })
        .order("version", { ascending: true });
      if (vErr) return json({ error: vErr.message }, 400);

      // Which PDFs actually exist in storage (so the UI can show real state,
      // not assume). Listed per-prefix; cheap at this scale.
      const present = new Set<string>();
      for (const d of docs ?? []) {
        const { data: files } = await admin.storage
          .from(BUCKET)
          .list(d.doc_key, { limit: 200 });
        for (const f of files ?? []) present.add(`${d.doc_key}/${f.name}`);
      }

      const byDoc: Record<string, unknown[]> = {};
      for (const v of vers ?? []) {
        (byDoc[v.doc_key] ??= []).push({ ...v, stored: present.has(v.pdf_path) });
      }

      return json({
        generated_at: new Date().toISOString(),
        totals: {
          lineages: docs?.length ?? 0,
          versions: vers?.length ?? 0,
          stored: present.size,
          missing: (vers?.length ?? 0) - present.size,
        },
        documents: (docs ?? []).map((d) => ({ ...d, versions: byDoc[d.doc_key] ?? [] })),
      });
    }

    // ---------------- signed download URL ----------------
    if (action === "signed_url") {
      const pdfPath = String(body?.pdf_path ?? "");
      if (!pdfPath) return json({ error: "pdf_path required" }, 400);

      // Only hand out URLs for paths the registry actually knows about.
      const { data: row } = await admin
        .from("doc_library_versions")
        .select("pdf_path")
        .eq("pdf_path", pdfPath)
        .maybeSingle();
      const isCompendium = pdfPath.startsWith("_compendium/");
      if (!row && !isCompendium) return json({ error: "Unknown document path" }, 404);

      const { data, error } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(pdfPath, 300);
      if (error) return json({ error: error.message }, 404);
      return json({ url: data.signedUrl, expires_in: 300 });
    }

    // ---------------- operator ingest of rendered PDFs ----------------
    // The admin's own authenticated session uploads the binaries; no service
    // credential ever leaves the server and no secret is shared out of band.
    if (action === "ingest") {
      const pdfPath = String(body?.pdf_path ?? "");
      const b64 = String(body?.content_base64 ?? "");
      if (!pdfPath || !b64) return json({ error: "pdf_path and content_base64 required" }, 400);

      const { data: row } = await admin
        .from("doc_library_versions")
        .select("id,pdf_bytes")
        .eq("pdf_path", pdfPath)
        .maybeSingle();
      const isCompendium = pdfPath.startsWith("_compendium/");
      if (!row && !isCompendium) return json({ error: "Unknown document path" }, 404);

      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(pdfPath, bin, { contentType: "application/pdf", upsert: true });
      if (upErr) return json({ error: upErr.message }, 400);

      return json({ ok: true, pdf_path: pdfPath, bytes: bin.length });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    console.error("doc-library error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
