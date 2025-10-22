import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template_id, test_data, send_test = false } = await req.json();

    if (!template_id) {
      throw new Error("template_id is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch template
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', template_id)
      .single();

    if (error || !template) {
      throw new Error("Template not found");
    }

    // Generate sample data for all variables if not provided
    const sampleData: { [key: string]: string } = test_data || {};
    
    if (!test_data) {
      (template.variables as string[]).forEach((variable: string) => {
        sampleData[variable] = `[Sample ${variable}]`;
      });
    }

    // Replace variables in template
    let renderedHtml = template.html_content;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, 'g');
      renderedHtml = renderedHtml.replace(regex, value);
    });

    // Validate rendered output - check for unreplaced variables
    const unreplacedVars = renderedHtml.match(/\{\{\s*\.\w+\s*\}\}/g);
    const issues: string[] = [];
    
    if (unreplacedVars && unreplacedVars.length > 0) {
      issues.push(`Unreplaced variables found: ${unreplacedVars.join(', ')}`);
    }

    // Check for empty src/href attributes
    const emptySrc = renderedHtml.match(/src=["'](\s*)["']/g);
    const emptyHref = renderedHtml.match(/href=["'](\s*)["']/g);
    
    if (emptySrc && emptySrc.length > 0) {
      issues.push(`Found ${emptySrc.length} empty src attributes`);
    }
    if (emptyHref && emptyHref.length > 0) {
      issues.push(`Found ${emptyHref.length} empty href attributes`);
    }

    // If test=true, send actual email
    if (send_test) {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      const { data: authUser } = await supabase.auth.getUser(
        req.headers.get('Authorization')?.replace('Bearer ', '') || ''
      );

      if (!authUser.user?.email) {
        throw new Error("Could not determine recipient email");
      }

      await resend.emails.send({
        from: "ProCann Edu <noreply@procannedu.com>",
        to: [authUser.user.email],
        subject: `[TEST] ${template.subject_line}`,
        html: renderedHtml,
      });

      // Update last_tested_at
      await supabase
        .from('email_templates')
        .update({ last_tested_at: new Date().toISOString() })
        .eq('id', template_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Test email sent",
          html: renderedHtml,
          issues: issues.length > 0 ? issues : undefined,
          sent: true
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Return rendered preview
    return new Response(
      JSON.stringify({ 
        html: renderedHtml,
        issues: issues.length > 0 ? issues : undefined,
        sent: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error rendering template:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
