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

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const { urgent, section_number, summary, compliance_risk } = await req.json().catch(() => ({}));

    console.log('Checking for outdated content...');

    // Get outdated content
    const { data: outdatedItems, error } = await supabase
      .rpc('detect_outdated_content');

    if (error) {
      throw error;
    }

    console.log(`Found ${outdatedItems?.length || 0} outdated items`);

    if (!outdatedItems || outdatedItems.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No outdated content found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group by urgency
    const critical = outdatedItems.filter((i: any) => i.status === 'critical');
    const high = outdatedItems.filter((i: any) => i.status === 'high');
    const medium = outdatedItems.filter((i: any) => i.status === 'medium');

    // Build email HTML
    let emailHtml = '<h1>📋 Content Review Alert</h1>';

    if (urgent) {
      emailHtml += `
        <div style="background: #fee; padding: 20px; border-left: 5px solid #c00; margin-bottom: 20px;">
          <h2>🚨 CRITICAL: Regulation Updated</h2>
          <p><strong>COMAR ${section_number}</strong> has been updated.</p>
          <p>${summary}</p>
          ${compliance_risk ? `<p><strong>Compliance Risk:</strong> ${compliance_risk}</p>` : ''}
        </div>
      `;
    }

    if (critical.length > 0) {
      emailHtml += `
        <div style="background: #fee; padding: 20px; border-left: 5px solid #c00; margin-bottom: 20px;">
          <h2>🚨 ${critical.length} Critical Items Require Immediate Attention</h2>
          <ul>
            ${critical.map((item: any) => `<li>${item.location} - ${item.relevant_regulatory_updates} regulation changes</li>`).join('')}
          </ul>
          <a href="https://www.procannedu.com/admin/content-review?filter=critical" 
             style="display: inline-block; padding: 10px 20px; background: #c00; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px;">
            Review Critical Items
          </a>
        </div>
      `;
    }

    emailHtml += `
      <div style="margin-top: 20px;">
        <h3>Summary</h3>
        <ul>
          <li>Critical: ${critical.length}</li>
          <li>High: ${high.length}</li>
          <li>Medium: ${medium.length}</li>
          <li><strong>Total: ${outdatedItems.length}</strong></li>
        </ul>
      </div>

      <p style="margin-top: 30px;">
        <a href="https://www.procannedu.com/admin/content-review" 
           style="display: inline-block; padding: 12px 25px; background: #2e7d32; color: white; text-decoration: none; border-radius: 5px;">
          View Full Content Review Dashboard
        </a>
      </p>
    `;

    // Get admin emails
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    const adminEmails = await Promise.all(
      (admins || []).map(async (admin: any) => {
        const { data: { user } } = await supabase.auth.admin.getUserById(admin.user_id);
        return user?.email;
      })
    );

    const validEmails = adminEmails.filter(email => email);

    if (validEmails.length === 0) {
      console.log('No admin emails found');
      return new Response(
        JSON.stringify({ message: 'No admin emails to notify' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ProCann Education <notifications@procannedu.com>',
        to: validEmails,
        subject: urgent 
          ? `🚨 CRITICAL: COMAR ${section_number} Updated` 
          : `📋 Weekly Content Review: ${critical.length} Critical Items`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      throw new Error(`Resend API failed: ${emailResponse.status}`);
    }

    console.log(`Alert sent to ${validEmails.length} admins`);

    return new Response(
      JSON.stringify({ success: true, emails_sent: validEmails.length }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in send-outdated-content-alerts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
