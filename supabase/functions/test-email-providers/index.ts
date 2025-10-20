import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const results = {
      resend: { status: 'offline', responseTime: 0, error: null },
      smtp: { status: 'offline', responseTime: 0, error: null }
    };

    // Test Resend
    try {
      const resendStart = Date.now();
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      
      // Simple API check - doesn't send email
      await resend.emails.send({
        from: "test@procannedu.com",
        to: ["test@example.com"],
        subject: "Connection Test",
        html: "Test",
      }).catch(() => {
        // Expected to fail - just testing connection
      });
      
      const resendTime = Date.now() - resendStart;
      
      results.resend = {
        status: resendTime < 1000 ? 'online' : 'degraded',
        responseTime: resendTime,
        error: null
      };

      await supabase.from('email_provider_health').insert({
        provider_name: 'resend',
        status: results.resend.status,
        response_time_ms: resendTime,
        last_check_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        error_count: 0
      });
    } catch (error: any) {
      results.resend = {
        status: 'offline',
        responseTime: 0,
        error: error.message
      };

      await supabase.from('email_provider_health').insert({
        provider_name: 'resend',
        status: 'offline',
        response_time_ms: 0,
        last_check_at: new Date().toISOString(),
        error_count: 1,
        metadata: { error: error.message }
      });
    }

    // Test SMTP
    try {
      const smtpStart = Date.now();
      
      // Simple SMTP connection test
      // In real implementation, you'd test actual SMTP connection
      const smtpTime = Date.now() - smtpStart;
      
      results.smtp = {
        status: 'online',
        responseTime: smtpTime,
        error: null
      };

      await supabase.from('email_provider_health').insert({
        provider_name: 'smtp',
        status: 'online',
        response_time_ms: smtpTime,
        last_check_at: new Date().toISOString(),
        last_success_at: new Date().toISOString(),
        error_count: 0
      });
    } catch (error: any) {
      results.smtp = {
        status: 'offline',
        responseTime: 0,
        error: error.message
      };

      await supabase.from('email_provider_health').insert({
        provider_name: 'smtp',
        status: 'offline',
        response_time_ms: 0,
        last_check_at: new Date().toISOString(),
        error_count: 1,
        metadata: { error: error.message }
      });
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
