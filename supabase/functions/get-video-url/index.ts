// Mints a short-lived signed URL for a private training video,
// after verifying the caller has access (public / authenticated / enrolled).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const SIGNED_URL_TTL_SECONDS = 600; // 10 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { assetKey } = await req.json().catch(() => ({}));
    if (!assetKey || typeof assetKey !== "string") {
      return json({ success: false, error_code: "missing_asset_key" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: asset, error: assetError } = await admin
      .from("video_assets")
      .select("id, asset_key, title, description, duration_seconds, thumbnail_url, storage_path, public_url, bucket_id, access_level, course_id, is_active, fallback_storage_path, fallback_bucket_id")
      .eq("asset_key", assetKey)
      .eq("is_active", true)
      .maybeSingle();

    if (assetError) {
      console.error("video_assets lookup failed", assetError);
      return json({ success: false, error_code: "lookup_failed" }, 200);
    }
    if (!asset) {
      return json({ success: false, error_code: "not_found" }, 200);
    }

    // Resolve user identity only when needed (non-public assets).
    let userId: string | null = null;
    if (asset.access_level !== "public") {
      const authHeader = req.headers.get("Authorization") ?? "";
      if (!authHeader.startsWith("Bearer ")) {
        return json({ success: false, error_code: "not_authenticated" }, 200);
      }
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser();
      if (userError || !userData?.user) {
        return json({ success: false, error_code: "not_authenticated" }, 200);
      }
      userId = userData.user.id;
    }

    // Authorization
    if (asset.access_level === "enrolled") {
      if (!asset.course_id) {
        return json({ success: false, error_code: "misconfigured" }, 200);
      }
      const { data: ent } = await admin
        .from("course_entitlements")
        .select("id")
        .eq("user_id", userId!)
        .eq("course_id", asset.course_id)
        .in("status", ["active", "granted", "issued"])
        .limit(1)
        .maybeSingle();
      if (!ent) {
        return json({ success: false, error_code: "not_authorized" }, 200);
      }
    }
    // "authenticated" requires a signed-in user (verified above).
    // "public" allows anonymous access.

    // If the file isn't uploaded yet
    if (!asset.storage_path) {
      return json({
        success: false,
        error_code: "not_uploaded",
        title: asset.title,
        thumbnail_url: asset.thumbnail_url,
        duration_seconds: asset.duration_seconds,
      }, 200);
    }

    // Public bucket fast-path
    if (asset.access_level === "public" && asset.public_url) {
      return json({
        success: true,
        url: asset.public_url,
        expires_at: null,
        title: asset.title,
        thumbnail_url: asset.thumbnail_url,
        duration_seconds: asset.duration_seconds,
      });
    }

    // Optional Storage-hosted backup MP4 (used if the primary embed refuses to play).
    let fallback_url: string | null = null;
    if (asset.fallback_storage_path) {
      const fbBucket = asset.fallback_bucket_id || "secure-videos";
      const { data: fbSigned, error: fbErr } = await admin
        .storage
        .from(fbBucket)
        .createSignedUrl(asset.fallback_storage_path, SIGNED_URL_TTL_SECONDS);
      if (fbErr) {
        console.warn("fallback createSignedUrl failed", fbErr);
      } else {
        fallback_url = fbSigned?.signedUrl ?? null;
      }
    }

    // Vimeo path — used while migration to Supabase Storage is in progress.
    // storage_path format: "vimeo/<id>" or "vimeo/<id>?h=<hash>"
    if (asset.storage_path.startsWith("vimeo/")) {
      const ref = asset.storage_path.slice("vimeo/".length);
      const [id, query] = ref.split("?");
      const hash = new URLSearchParams(query ?? "").get("h");
      return json({
        success: true,
        provider: "vimeo",
        vimeo_id: id,
        vimeo_hash: hash,
        fallback_url,
        expires_at: fallback_url ? new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString() : null,
        title: asset.title,
        thumbnail_url: asset.thumbnail_url,
        duration_seconds: asset.duration_seconds,
      });
    }

    const bucket = asset.bucket_id || "training-videos";


    // Lazy bucket creation (idempotent) — storage.buckets cannot be inserted via SQL
    const { data: existing } = await admin.storage.getBucket(bucket);
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 5_368_709_120,
        allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
      });
      if (createErr && !/already exists/i.test(createErr.message)) {
        console.error("createBucket failed", createErr);
        return json({ success: false, error_code: "bucket_unavailable" }, 200);
      }
    }

    const { data: signed, error: signError } = await admin
      .storage
      .from(bucket)
      .createSignedUrl(asset.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      console.error("createSignedUrl failed", signError);
      return json({ success: false, error_code: "signing_failed" }, 200);
    }

    return json({
      success: true,
      url: signed.signedUrl,
      expires_at: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
      title: asset.title,
      thumbnail_url: asset.thumbnail_url,
      duration_seconds: asset.duration_seconds,
    });
  } catch (err) {
    console.error("get-video-url error", err);
    return json({ success: false, error_code: "internal_error" }, 500);
  }
});
