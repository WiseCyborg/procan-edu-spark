import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipient, digest, metrics, healthScore, alerts } = await req.json();
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY not configured');

    // Build email HTML
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .health-score { font-size: 48px; font-weight: bold; margin: 10px 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #e0e0e0; }
          .metric { display: inline-block; width: 48%; margin: 10px 1%; padding: 15px; background: #f8f9fa; border-radius: 8px; }
          .alert { padding: 15px; margin: 10px 0; border-left: 4px solid #ef4444; background: #fef2f2; }
          .insight { padding: 15px; margin: 10px 0; background: #eff6ff; border-left: 4px solid #3b82f6; }
          .action-item { padding: 12px; margin: 8px 0; background: #f0fdf4; border-left: 4px solid #22c55e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧠 Daily Owner Intelligence Report</h1>
            <div class="health-score">${healthScore}/100</div>
            <p>Platform Health Score</p>
          </div>
          
          <div class="content">
            <h2>📊 Executive Summary</h2>
            <p>${digest.executive_summary}</p>

            <h2>💰 24-Hour Metrics</h2>
            <div style="margin: 20px 0;">
              <div class="metric">
                <strong>Revenue:</strong> $${metrics.dailyRevenue?.toFixed(2) || '0.00'}
              </div>
              <div class="metric">
                <strong>New Users:</strong> ${metrics.newUsers || 0}
              </div>
              <div class="metric">
                <strong>Active Users:</strong> ${metrics.activeUsers || 0}
              </div>
              <div class="metric">
                <strong>Modules Completed:</strong> ${metrics.completedModules || 0}
              </div>
              <div class="metric">
                <strong>Email Delivery:</strong> ${metrics.emailDeliveryRate || '100.0'}%
              </div>
            </div>

            ${alerts && alerts.length > 0 ? `
              <h2>🚨 Critical Alerts</h2>
              ${alerts.map(a => `
                <div class="alert">
                  <strong>[${a.severity.toUpperCase()}]</strong> ${a.title}
                  <br/><small>${a.description}</small>
                </div>
              `).join('')}
            ` : ''}

            <h2>💡 AI Insights</h2>
            ${digest.insights.map(i => `
              <div class="insight">${i}</div>
            `).join('')}

            <h2>✅ Recommended Actions</h2>
            ${digest.recommended_actions.map(a => `
              <div class="action-item">${a}</div>
            `).join('')}

            ${digest.risk_assessment ? `
              <h2>⚠️ Risk Assessment</h2>
              <p>${digest.risk_assessment}</p>
            ` : ''}
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>ProCann Education - AI Operations Center</p>
            <p><a href="https://yourapp.com/owners-intelligence">View Full Dashboard</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProCann Education <noreply@procannedu.com>',
        to: recipient,
        subject: `Daily Digest - Platform Health: ${healthScore}/100`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API failed: ${response.status}`);
    }

    const result = await response.json();

    // Log email
    await supabase.from('email_logs').insert({
      recipient_email: recipient,
      email_type: 'owner_digest',
      subject: `Daily Digest - Platform Health: ${healthScore}/100`,
      status: 'sent',
      provider_response: result
    });

    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending owner digest email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
