import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Fetching admin users and recent recommendations...');

    // Get all admin users
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) throw rolesError;

    if (!adminRoles || adminRoles.length === 0) {
      console.log('No admin users found');
      return new Response(
        JSON.stringify({ message: 'No admin users to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin profiles with emails
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', adminRoles.map(r => r.user_id));

    if (profilesError) throw profilesError;

    // Get recent recommendations from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recommendations, error: recsError } = await supabase
      .from('curriculum_recommendations')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('priority')
      .order('created_at', { ascending: false });

    if (recsError) throw recsError;

    if (!recommendations || recommendations.length === 0) {
      console.log('No new recommendations in the last 7 days');
      return new Response(
        JSON.stringify({ message: 'No new recommendations to report' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group recommendations by priority
    const critical = recommendations.filter(r => r.priority === 'critical');
    const high = recommendations.filter(r => r.priority === 'high');
    const medium = recommendations.filter(r => r.priority === 'medium');
    const low = recommendations.filter(r => r.priority === 'low');

    // Build email HTML
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Content Optimizer Weekly Digest</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <h1 style="color: #2563eb; margin-bottom: 10px; font-size: 24px;">
      🤖 AI Content Optimizer Weekly Digest
    </h1>
    <p style="color: #666; margin-bottom: 30px; font-size: 14px;">
      Weekly analysis of exam performance and content recommendations
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 15px; margin-bottom: 25px; border-radius: 4px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af;">📊 Summary</h3>
      <p style="margin: 5px 0; font-size: 14px;">
        <strong>${recommendations.length}</strong> new recommendations generated this week
      </p>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
        ${critical.length > 0 ? `<div style="background: #fef2f2; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #dc2626;">${critical.length}</div>
          <div style="font-size: 12px; color: #991b1b;">Critical</div>
        </div>` : ''}
        ${high.length > 0 ? `<div style="background: #fff7ed; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #ea580c;">${high.length}</div>
          <div style="font-size: 12px; color: #9a3412;">High</div>
        </div>` : ''}
        ${medium.length > 0 ? `<div style="background: #fefce8; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #ca8a04;">${medium.length}</div>
          <div style="font-size: 12px; color: #854d0e;">Medium</div>
        </div>` : ''}
        ${low.length > 0 ? `<div style="background: #f0fdf4; padding: 8px; border-radius: 4px; text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #16a34a;">${low.length}</div>
          <div style="font-size: 12px; color: #166534;">Low</div>
        </div>` : ''}
      </div>
    </div>

    ${critical.length > 0 ? `
    <div style="margin-bottom: 25px;">
      <h2 style="color: #dc2626; font-size: 18px; margin-bottom: 15px; display: flex; align-items: center;">
        🚨 Critical Priority
      </h2>
      ${critical.map(rec => `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 12px; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #991b1b; font-size: 15px;">${rec.title}</h4>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">${rec.description}</p>
          <div style="font-size: 12px; color: #666;">
            <strong>Impact:</strong> ${rec.impact}<br>
            <strong>Effort:</strong> ${rec.estimated_effort}
            ${rec.related_sections && rec.related_sections.length > 0 ? `<br><strong>Sections:</strong> ${rec.related_sections.join(', ')}` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${high.length > 0 ? `
    <div style="margin-bottom: 25px;">
      <h2 style="color: #ea580c; font-size: 18px; margin-bottom: 15px;">
        ⚠️ High Priority
      </h2>
      ${high.slice(0, 3).map(rec => `
        <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 12px; margin-bottom: 10px; border-radius: 4px;">
          <h4 style="margin: 0 0 6px 0; color: #9a3412; font-size: 14px;">${rec.title}</h4>
          <p style="margin: 0 0 6px 0; font-size: 12px; color: #666;">${rec.description}</p>
          <div style="font-size: 11px; color: #666;">
            <strong>Impact:</strong> ${rec.impact}
          </div>
        </div>
      `).join('')}
      ${high.length > 3 ? `<p style="font-size: 12px; color: #666; text-align: center;">+ ${high.length - 3} more high priority recommendations</p>` : ''}
    </div>
    ` : ''}

    ${medium.length > 0 || low.length > 0 ? `
    <div style="background-color: #f8fafc; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
      <h3 style="margin: 0 0 10px 0; font-size: 16px; color: #1e40af;">📋 Additional Recommendations</h3>
      <p style="margin: 0; font-size: 13px; color: #666;">
        ${medium.length} medium priority and ${low.length} low priority recommendations are available in the dashboard.
      </p>
    </div>
    ` : ''}

    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <a href="https://www.procannedu.com/admin/exam-analytics" 
         style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
        View Full Dashboard
      </a>
      <p style="margin-top: 15px; font-size: 12px; color: #999;">
        This is an automated weekly digest from the AI Content Optimizer
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send emails to all admins
    const emailPromises = adminProfiles.map(async (profile) => {
      const { data, error } = await supabase.functions.invoke('send-email-smtp', {
        body: {
          to: profile.email,
          subject: `📊 AI Content Optimizer Weekly Digest - ${recommendations.length} New Recommendations`,
          html: emailHtml,
        },
      });

      if (error) {
        console.error(`Failed to send email to ${profile.email}:`, error);
        return { email: profile.email, success: false, error };
      }

      console.log(`Email sent successfully to ${profile.email}`);
      return { email: profile.email, success: true };
    });

    const results = await Promise.all(emailPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Digest emails sent: ${successCount}/${adminProfiles.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        emails_sent: successCount,
        total_admins: adminProfiles.length,
        recommendations_count: recommendations.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-optimizer-digest:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
