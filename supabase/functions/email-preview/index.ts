import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { UnifiedEmailService } from "../_shared/unified-email-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PreviewRequest {
  templateName: string;
  variables?: Record<string, any>;
  format?: "html" | "text" | "both" | "json";
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("📧 [EMAIL-PREVIEW] Request received");

  try {
    // Verify admin access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("❌ [EMAIL-PREVIEW] Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    
    if (!isAdmin) {
      console.error("❌ [EMAIL-PREVIEW] User is not admin");
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PreviewRequest = await req.json();
    const { templateName, variables = {}, format = "both" } = body;

    if (!templateName) {
      return new Response(
        JSON.stringify({ error: "templateName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📧 [EMAIL-PREVIEW] Previewing template: ${templateName}`);

    const emailService = new UnifiedEmailService();
    
    // Get preview
    const preview = await emailService.preview(templateName, variables);

    if (!preview.templateFound) {
      return new Response(
        JSON.stringify({ 
          error: `Template "${templateName}" not found or inactive`,
          templateFound: false,
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format response based on request
    if (format === "html") {
      return new Response(preview.html, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/html" },
      });
    }

    if (format === "text") {
      return new Response(preview.text, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "text/plain" },
      });
    }

    // Return JSON with all parts
    const response = {
      success: true,
      templateName,
      subject: preview.subject,
      html: preview.html,
      text: preview.text,
      htmlLength: preview.html.length,
      textLength: preview.text.length,
      hasHtml: preview.html.length > 50,
      hasText: preview.text.length > 10,
      variablesUsed: Object.keys(variables),
      previewedAt: new Date().toISOString(),
    };

    console.log(`✅ [EMAIL-PREVIEW] Preview generated successfully`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ [EMAIL-PREVIEW] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
