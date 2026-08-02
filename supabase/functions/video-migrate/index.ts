// video-migrate — Workstream A batch mover: Supabase Storage -> Cloudflare R2.
//
// Actions:
//   migrate  { assetKey? | assetId? | limit? }  move one (or a small batch of) asset(s)
//   verify   { assetKey? | limit? }             assert R2 object present + DB pointer + source gone
//
// Admin-only (JWT with admin role) OR service-role invocation from jobs-processor.
// Never deletes the source object until the DB update is written AND re-read.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  canonicalKey,
  loadR2Config,
  r2Delete,
  r2Head,
  r2PublicUrl,
  r2Put,
  type R2Config,
} from "../_shared/r2.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface AssetRow {
  id: string;
  asset_key: string;
  title: string | null;
  course_id: string | null;
  bucket_id: string | null;
  storage_path: string | null;
  public_url: string | null;
  storage_provider: string | null;
  r2_key: string | null;
  migration_status: string | null;
  legacy_storage_path: string | null;
  legacy_bucket_id: string | null;
  module_id: string | null;
}

const ASSET_COLUMNS =
  "id, asset_key, title, course_id, bucket_id, storage_path, public_url, storage_provider, r2_key, migration_status, legacy_storage_path, legacy_bucket_id, module_id";

async function isAdminCaller(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  // Service-role invocation (jobs-processor) is trusted.
  if (token === SERVICE_KEY) return true;

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return false;
  const { data: hasRole } = await admin.rpc("has_role", {
    _user_id: data.user.id,
    _role: "admin",
  });
  return hasRole === true;
}

/** Resolve the canonical R2 key for an asset (course slug + module number). */
async function resolveKey(admin: any, asset: AssetRow) {
  let courseSlug: string | null = null;
  if (asset.course_id) {
    const { data: course } = await admin
      .from("courses")
      .select("title")
      .eq("id", asset.course_id)
      .maybeSingle();
    courseSlug = course?.title ?? null;
  }

  let moduleNumber: number | null = null;
  if (asset.module_id) {
    const { data: mod } = await admin
      .from("course_modules")
      .select("module_number")
      .eq("id", asset.module_id)
      .maybeSingle();
    moduleNumber = mod?.module_number ?? null;
  }

  return canonicalKey({
    courseSlug,
    moduleNumber,
    assetKey: asset.asset_key,
    title: asset.title,
  });
}

async function migrateOne(admin: any, cfg: R2Config, asset: AssetRow) {
  const result: Record<string, unknown> = { asset_key: asset.asset_key, id: asset.id };

  if (asset.storage_provider === "r2" && asset.r2_key) {
    return { ...result, status: "already_migrated", r2_key: asset.r2_key };
  }
  if (!asset.storage_path) {
    return { ...result, status: "skipped", reason: "no_storage_path" };
  }
  if (asset.storage_path.startsWith("vimeo/")) {
    return { ...result, status: "skipped", reason: "vimeo_pointer" };
  }

  const sourceBucket = asset.bucket_id || "training-videos";
  const sourcePath = asset.storage_path;
  const { key, unmapped } = await resolveKey(admin, asset);

  // 1) Claim the row (guarded so two workers cannot claim the same asset).
  const { data: claimed, error: claimErr } = await admin
    .from("video_assets")
    .update({ migration_status: "in_progress", migration_error: null })
    .eq("id", asset.id)
    .neq("migration_status", "in_progress")
    .select("id")
    .maybeSingle();
  if (claimErr) throw new Error(`claim_failed: ${claimErr.message}`);
  if (!claimed) return { ...result, status: "skipped", reason: "claimed_by_other_worker" };

  try {
    // 2) Snapshot the legacy pointer once, so the move is reversible.
    if (!asset.legacy_storage_path) {
      await admin
        .from("video_assets")
        .update({ legacy_storage_path: sourcePath, legacy_bucket_id: sourceBucket })
        .eq("id", asset.id);
    }

    // 3) Idempotency: if R2 already holds a non-empty object at the key, skip the copy.
    const head = await r2Head(cfg, key);
    let uploadedBytes = head.size;

    if (!head.exists || head.size === 0) {
      // 4) Download from Supabase Storage with the service role.
      const { data: blob, error: dlErr } = await admin.storage.from(sourceBucket).download(sourcePath);
      if (dlErr || !blob) throw new Error(`download_failed: ${dlErr?.message ?? "empty body"}`);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength === 0) throw new Error("download_failed: zero bytes");

      // 5) PUT to R2.
      await r2Put(cfg, key, bytes, blob.type || "video/mp4");
      uploadedBytes = bytes.byteLength;

      const confirm = await r2Head(cfg, key);
      if (!confirm.exists || confirm.size !== bytes.byteLength) {
        throw new Error(`r2_verify_mismatch: expected ${bytes.byteLength}, got ${confirm.size}`);
      }
    }

    // 6) Repoint the DB at R2.
    const publicUrl = r2PublicUrl(cfg, key);
    const { error: updErr } = await admin
      .from("video_assets")
      .update({
        public_url: publicUrl,
        storage_path: key,
        bucket_id: cfg.bucket,
        storage_provider: "r2",
        r2_key: key,
        migrated_at: new Date().toISOString(),
        migration_status: "done",
        migration_error: null,
      })
      .eq("id", asset.id);
    if (updErr) throw new Error(`db_update_failed: ${updErr.message}`);

    // 7) Re-read to confirm before touching the source.
    const { data: reread } = await admin
      .from("video_assets")
      .select("storage_provider, r2_key, public_url")
      .eq("id", asset.id)
      .maybeSingle();
    if (reread?.storage_provider !== "r2" || reread?.r2_key !== key) {
      throw new Error("db_confirm_failed: pointer did not persist");
    }

    // 8) Only now remove the source object (Storage API — never SQL).
    let sourceDeleted = false;
    const { error: rmErr } = await admin.storage.from(sourceBucket).remove([sourcePath]);
    if (rmErr) {
      console.warn(`[video-migrate] source delete failed for ${asset.asset_key}:`, rmErr.message);
    } else {
      sourceDeleted = true;
    }

    return {
      ...result,
      status: "migrated",
      r2_key: key,
      unmapped,
      bytes: uploadedBytes,
      public_url: publicUrl,
      source_deleted: sourceDeleted,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await admin
      .from("video_assets")
      .update({ migration_status: "failed", migration_error: message.slice(0, 500) })
      .eq("id", asset.id);
    return { ...result, status: "failed", error: message };
  }
}

async function verifyOne(admin: any, cfg: R2Config, asset: AssetRow) {
  const checks: Record<string, boolean> = {};
  const key = asset.r2_key ?? asset.storage_path ?? "";

  let size = 0;
  try {
    const head = await r2Head(cfg, key);
    checks.r2_object_present = head.exists && head.size > 0;
    size = head.size;
  } catch {
    checks.r2_object_present = false;
  }

  checks.db_points_at_r2 = asset.storage_provider === "r2" && !!asset.r2_key;
  checks.public_url_on_r2 = !!asset.public_url && asset.public_url.startsWith(cfg.publicBaseUrl);

  // Source object should be gone.
  checks.source_removed = true;
  if (asset.legacy_storage_path && asset.legacy_bucket_id) {
    const dir = asset.legacy_storage_path.includes("/")
      ? asset.legacy_storage_path.slice(0, asset.legacy_storage_path.lastIndexOf("/"))
      : "";
    const name = asset.legacy_storage_path.split("/").pop()!;
    const { data: listed } = await admin.storage
      .from(asset.legacy_bucket_id)
      .list(dir, { search: name, limit: 100 });
    checks.source_removed = !(listed ?? []).some((o: any) => o.name === name);
  }

  const pass = Object.values(checks).every(Boolean);
  return { asset_key: asset.asset_key, id: asset.id, r2_key: key, size, pass, checks };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    if (!(await isAdminCaller(req, admin))) {
      return json({ success: false, error_code: "not_authorized" }, 200);
    }

    const body = await req.json().catch(() => ({}));
    const action: string = body.action ?? "migrate";
    const limit: number = Math.min(Number(body.limit ?? 1) || 1, 10);

    let cfg: R2Config;
    try {
      cfg = loadR2Config();
    } catch (err) {
      return json({
        success: false,
        error_code: "r2_not_configured",
        error: err instanceof Error ? err.message : String(err),
      }, 200);
    }

    let query = admin.from("video_assets").select(ASSET_COLUMNS).eq("is_active", true);

    if (body.assetId) query = query.eq("id", body.assetId);
    else if (body.assetKey) query = query.eq("asset_key", body.assetKey);
    else if (Array.isArray(body.assetKeys) && body.assetKeys.length) {
      query = query.in("asset_key", body.assetKeys);
    } else if (action === "verify") {
      query = query.eq("storage_provider", "r2");
    } else {
      query = query.neq("storage_provider", "r2").not("storage_path", "is", null);
    }

    const { data: assets, error } = await query.limit(limit);
    if (error) {
      console.error("[video-migrate] asset lookup failed", error);
      return json({ success: false, error_code: "lookup_failed", error: error.message }, 200);
    }
    if (!assets?.length) {
      return json({ success: true, action, processed: 0, results: [] });
    }

    const results: unknown[] = [];
    for (const asset of assets as unknown as AssetRow[]) {
      results.push(
        action === "verify"
          ? await verifyOne(admin, cfg, asset)
          : await migrateOne(admin, cfg, asset),
      );
    }

    const failed = results.filter((r: any) => r.status === "failed" || r.pass === false).length;
    return json({ success: true, action, processed: results.length, failed, results });
  } catch (err) {
    console.error("[video-migrate] error", err);
    return json({
      success: false,
      error_code: "internal_error",
      error: err instanceof Error ? err.message : String(err),
    }, 500);
  }
});

// Exported for potential reuse; keeps r2Delete referenced for the rollback path.
export { r2Delete };
