import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  email: string;
  organizationName: string;
  inviterName: string;
  role: string;
  invitationToken: string;
  expiryDate: string;
  customMessage?: string;
  isReminder?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      email, 
      organizationName, 
      inviterName, 
      role, 
      invitationToken, 
      expiryDate,
      customMessage,
      isReminder 
    }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation email to ${email}`, { organizationName, role, isReminder });

    // Build the acceptance URL - points to student auth with invitation token
    const baseUrl = supabaseUrl.includes('zhmpwczrvitomsxjwpzc')
      ? 'https://zhmpwczrvitomsxjwpzc.lovable.app'
      : 'https://www.procannedu.com';
    const acceptInvitationURL = `${baseUrl}/auth?role=student&invitation=${invitationToken}`;
    
    // Format expiry date
    const formattedExpiryDate = new Date(expiryDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Prepare HTML email content with dynamic values
    let htmlContent = await Deno.readTextFile("./email-templates/invite.html");
    
    // Replace all template variables
    htmlContent = htmlContent
      .replace(/\{\{ \.Email \}\}/g, email)
      .replace(/\{\{ \.OrganizationName \}\}/g, organizationName)
      .replace(/\{\{ \.InviterName \}\}/g, inviterName)
      .replace(/\{\{ \.Role \}\}/g, role.charAt(0).toUpperCase() + role.slice(1))
      .replace(/\{\{ \.InvitationToken \}\}/g, invitationToken)
      .replace(/\{\{ \.ExpiryDate \}\}/g, formattedExpiryDate)
      .replace(/\{\{ \.AcceptInvitationURL \}\}/g, acceptInvitationURL);
    
    // Handle conditional custom message
    if (customMessage) {
      htmlContent = htmlContent
        .replace(/\{\{ if \.CustomMessage \}\}/g, '')
        .replace(/\{\{ end \}\}/g, '')
        .replace(/\{\{ \.CustomMessage \}\}/g, customMessage);
    } else {
      // Remove the entire custom message section if no message
      htmlContent = htmlContent.replace(
        /\{\{ if \.CustomMessage \}\}[\s\S]*?\{\{ end \}\}/g, 
        ''
      );
    }

    // Determine subject line
    const subject = isReminder 
      ? `Reminder: Join ${organizationName} on ProCann Edu` 
      : `You're Invited to Join ${organizationName} on ProCann Edu`;

    // Check for recent invitation emails (prevent duplicate sends within 5 minutes)
    const { data: recentEmail } = await supabase
      .from('email_logs')
      .select('id, created_at')
      .eq('recipient_email', email)
      .eq('email_type', 'staff_invitation')
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentEmail) {
      console.log(`Skipping duplicate invitation email to ${email} (sent ${Math.round((Date.now() - new Date(recentEmail.created_at).getTime()) / 1000)}s ago)`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Duplicate email prevented',
          skipped: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log email attempt
    const { data: emailLog } = await supabase
      .from('email_logs')
      .insert({
        recipient_email: email,
        email_type: 'staff_invitation',
        subject: subject,
        status: 'sending',
        metadata: {
          organization_name: organizationName,
          inviter_name: inviterName,
          role: role,
          invitation_token: invitationToken,
          is_reminder: isReminder || false
        }
      })
      .select()
      .single();

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "ProCann Edu <noreply@procannedu.com>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    if (emailResponse.error) {
      throw new Error(emailResponse.error.message || 'Failed to send email');
    }

    console.log("Invitation email sent successfully:", emailResponse);

    // Update email log with success status
    if (emailLog) {
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          provider_id: emailResponse.data?.id,
          sent_at: new Date().toISOString()
        })
        .eq('id', emailLog.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: emailResponse.data?.id,
        recipient: email 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-invitation-email function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
