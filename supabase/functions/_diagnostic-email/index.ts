import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const { to } = await req.json();
    const recipient = to || "flamevape@gmail.com";

    console.log(`🔬 [DIAGNOSTIC] ========== EMAIL TEST START ==========`);
    console.log(`🔬 [DIAGNOSTIC] Timestamp: ${new Date().toISOString()}`);
    console.log(`🔬 [DIAGNOSTIC] Recipient: ${recipient}`);
    console.log(`🔬 [DIAGNOSTIC] RESEND_API_KEY exists: ${!!Deno.env.get("RESEND_API_KEY")}`);
    console.log(`🔬 [DIAGNOSTIC] RESEND_API_KEY length: ${Deno.env.get("RESEND_API_KEY")?.length || 0}`);
    console.log(`🔬 [DIAGNOSTIC] RESEND_API_KEY prefix: ${Deno.env.get("RESEND_API_KEY")?.substring(0, 10)}...`);

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const startTime = Date.now();

    console.log(`🔬 [DIAGNOSTIC] Calling Resend API...`);

    const result = await resend.emails.send({
      from: "ProCann Edu <noreply@procannedu.com>",
      to: [recipient],
      subject: "🔬 Diagnostic Test - ProCann Edu",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .success { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .info { background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 15px 0; border-radius: 4px; }
            code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🔬 Diagnostic Email Test</h1>
          </div>
          <div class="content">
            <div class="success">
              <h2>✅ Email System Operational</h2>
              <p>This diagnostic email confirms that the ProCann Edu email infrastructure is working correctly.</p>
            </div>
            
            <div class="info">
              <h3>📋 Test Details</h3>
              <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
              <p><strong>Recipient:</strong> ${recipient}</p>
              <p><strong>Provider:</strong> Resend</p>
              <p><strong>Domain:</strong> procannedu.com</p>
              <p><strong>Function:</strong> _diagnostic-email</p>
            </div>
            
            <h3>🔍 What This Confirms:</h3>
            <ul>
              <li>✅ Resend API key is valid</li>
              <li>✅ Domain authentication (DKIM/SPF) is configured</li>
              <li>✅ Email routing is functional</li>
              <li>✅ HTML email rendering works</li>
              <li>✅ Edge function can send emails</li>
            </ul>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
              If you received this email, your ProCann Edu email system is fully operational.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `Diagnostic Email Test - Sent at ${new Date().toISOString()} to ${recipient}. If you received this, the email system is working correctly.`,
      headers: {
        "List-Unsubscribe": "<mailto:unsubscribe@procannedu.com>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"
      }
    });

    const responseTime = Date.now() - startTime;

    console.log(`✅ [DIAGNOSTIC] Email sent successfully in ${responseTime}ms`);
    console.log(`✅ [DIAGNOSTIC] Provider ID: ${result.data?.id}`);
    console.log(`✅ [DIAGNOSTIC] Full Resend Response:`, JSON.stringify(result, null, 2));
    console.log(`🔬 [DIAGNOSTIC] ========== EMAIL TEST END ==========`);

    return new Response(
      JSON.stringify({
        success: true,
        provider_id: result.data?.id,
        response_time_ms: responseTime,
        recipient: recipient,
        timestamp: new Date().toISOString(),
        message: "Diagnostic email sent successfully. Check recipient inbox.",
        full_response: result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error(`❌ [DIAGNOSTIC] ========== EMAIL TEST FAILED ==========`);
    console.error(`❌ [DIAGNOSTIC] Error message: ${error.message}`);
    console.error(`❌ [DIAGNOSTIC] Error name: ${error.name}`);
    console.error(`❌ [DIAGNOSTIC] Error stack:`, error.stack);
    console.error(`❌ [DIAGNOSTIC] Status code:`, error.statusCode);
    console.error(`❌ [DIAGNOSTIC] Full error object:`, JSON.stringify(error, null, 2));

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        error_name: error.name,
        error_code: error.statusCode,
        timestamp: new Date().toISOString(),
        help: "Check Supabase Edge Function logs for detailed error information",
        full_error: JSON.stringify(error),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
