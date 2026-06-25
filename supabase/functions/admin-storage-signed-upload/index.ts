// One-shot admin helper: mints a signed upload URL into a private Storage bucket.
// Gated by a shared bootstrap token (UPLOAD_BOOTSTRAP_TOKEN_V2) so the agent
// sandbox can upload large training-video MP4s without a user JWT.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-bootstrap-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const expected = Deno.env.get("UPLOAD_BOOTSTRAP_TOKEN_V2");
    const provided = req.headers.get("x-bootstrap-token");
    if (!expected || provided !== expected) {
      return json({ success: false, error_code: "not_authorized" }, 401);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service);

    const { bucket, path } = await req.json().catch(() => ({}));
    if (!bucket || !path) return json({ success: false, error_code: "missing_params" });

    const { data: existing } = await admin.storage.getBucket(bucket);
    if (!existing) {
      const { error: createErr } = await admin.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: 5_368_709_120,
        allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
      });
      if (createErr && !/already exists/i.test(createErr.message)) {
        return json({ success: false, error_code: "bucket_create_failed", detail: createErr.message });
      }
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(bucket)
      .createSignedUploadUrl(path, { upsert: true });
    if (signErr || !signed) return json({ success: false, error_code: "sign_failed", detail: signErr?.message });

    return json({ success: true, signed_url: signed.signedUrl, token: signed.token, path: signed.path });
  } catch (e) {
    console.error("admin-storage-signed-upload error", e);
    return json({ success: false, error_code: "internal_error" }, 500);
  }
});
