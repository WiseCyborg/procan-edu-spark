// One-shot setup: create the private `training-videos` storage bucket.
// Safe to call multiple times — idempotent.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: buckets } = await admin.storage.listBuckets();
  const exists = buckets?.some((b) => b.id === "training-videos");
  if (exists) {
    return new Response(JSON.stringify({ success: true, existed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { error } = await admin.storage.createBucket("training-videos", {
    public: false,
    fileSizeLimit: 5_368_709_120, // 5 GB
    allowedMimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
  });

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true, created: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
