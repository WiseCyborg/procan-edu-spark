import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEMPLATES = [
  { name: "welcome", subject: "Welcome to ProCann Edu!", variables: ["FirstName", "DashboardURL"] },
  { name: "certificate", subject: "Your Certificate is Ready", variables: ["FirstName", "CertificateNumber"] },
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let successCount = 0;

    for (const template of TEMPLATES) {
      const { error } = await supabase.from("email_templates").upsert({
        template_name: template.name,
        subject_line: template.subject,
        html_content: `<p>Template: ${template.name}</p>`,
        variables: template.variables,
      });
      
      if (!error) successCount++;
    }

    return new Response(
      JSON.stringify({ success: true, message: `Migrated ${successCount} templates` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
