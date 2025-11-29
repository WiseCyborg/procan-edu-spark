import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side validation schema
const StaffInvitationSchema = z.object({
  action: z.enum(['invite_single', 'invite_bulk', 'resend_invitation', 'cancel_invitation']),
  organizationId: z.string().uuid(),
  inviterId: z.string().uuid(),
  email: z.string().email().max(255).optional(),
  emails: z.array(z.string().email().max(255)).max(100).optional(),
  role: z.enum(['student', 'training_coordinator', 'dispensary_manager']).optional(),
  invitationId: z.string().uuid().optional(),
  customMessage: z.string().max(1000).optional()
}).refine((data) => {
  if (data.action === 'invite_single') return !!data.email;
  if (data.action === 'invite_bulk') return !!data.emails && data.emails.length > 0;
  if (data.action === 'resend_invitation' || data.action === 'cancel_invitation') return !!data.invitationId;
  return true;
}, {
  message: "Missing required fields for this action"
});

interface StaffInvitationRequest {
  action: 'invite_single' | 'invite_bulk' | 'resend_invitation' | 'cancel_invitation';
  organizationId: string;
  inviterId: string;
  email?: string;
  emails?: string[];
  role?: string;
  invitationId?: string;
  customMessage?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawData = await req.json();
    
    // VALIDATE INPUT
    const validationResult = StaffInvitationSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.error('[VALIDATION ERROR]', validationResult.error.issues);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid input data',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          })),
          code: 'VALIDATION_ERROR'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const validatedData = validationResult.data;
    const { action, organizationId, inviterId, email, emails, role, invitationId, customMessage } = validatedData;
    
    console.log(`Processing staff invitation: ${action}`);

    // Rate limit: 50 invitations per hour per organization
    const { data: rateLimitData } = await supabase.rpc('check_rate_limit', {
      _user_id: inviterId,
      _action_type: `send_invitations_org_${organizationId}`,
      _max_requests: 50,
      _window_minutes: 60
    });

    if (rateLimitData && rateLimitData.length > 0) {
      const remaining = rateLimitData[0].remaining;
      if (remaining <= 0) {
        console.warn(`[RATE LIMIT] Org ${organizationId} exceeded invitation limit`);
        return new Response(
          JSON.stringify({ 
            error: 'Too many invitations sent. Please try again in 1 hour.',
            code: 'RATE_LIMIT_EXCEEDED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    switch (action) {
      case 'invite_single':
        return await inviteSingleStaff(organizationId, inviterId, email!, role || 'student', customMessage);
      case 'invite_bulk':
        return await inviteBulkStaff(organizationId, inviterId, emails!, role || 'student', customMessage);
      case 'resend_invitation':
        return await resendInvitation(invitationId!);
      case 'cancel_invitation':
        return await cancelInvitation(invitationId!);
      default:
        throw new Error('Invalid action type');
    }

  } catch (error: any) {
    console.error('Error in staff-invitation-manager function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function inviteSingleStaff(organizationId: string, inviterId: string, email: string, role: string, customMessage?: string): Promise<Response> {
  console.log(`Inviting single staff member: ${email}`);
  
  // Check if user already exists or has pending invitation
  const { data: existingInvitation } = await supabase
    .from('staff_invitations')
    .select('*')
    .eq('email', email)
    .eq('organization_id', organizationId)
    .is('accepted_at', null)
    .single();

  if (existingInvitation) {
    throw new Error('User already has a pending invitation');
  }

  // Generate invitation token
  const { data: tokenData } = await supabase.rpc('generate_invitation_token');
  const invitationToken = tokenData || `INV-${Date.now()}`;

  // Create invitation record
  const { data: invitation, error } = await supabase
    .from('staff_invitations')
    .insert({
      organization_id: organizationId,
      inviter_id: inviterId,
      email,
      role,
      invitation_token: invitationToken,
      metadata: {
        custom_message: customMessage,
        invited_by: inviterId
      }
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating invitation: ${error.message}`);
  }

  // Get organization details for email
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  // Get inviter details
  const { data: inviter } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', inviterId)
    .single();

  const inviterName = inviter 
    ? `${inviter.first_name} ${inviter.last_name}`.trim() 
    : 'Your Administrator';

  // Send invitation email using dedicated send-invitation-email function
  const emailResponse = await supabase.functions.invoke('send-invitation-email', {
    body: {
      email: email,
      organizationName: organization?.name || 'Cannabis Training Organization',
      inviterName: inviterName,
      role: role,
      invitationToken: invitationToken,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      customMessage: customMessage
    }
  });

  if (emailResponse.error) {
    console.error('Failed to send invitation email:', emailResponse.error);
    // Don't fail the invitation, just log the error
  }

  // Log communication
  await supabase
    .from('communication_logs')
    .insert({
      organization_id: organizationId,
      communication_type: 'staff_invitation',
      subject: `Invitation to Cannabis Training Program`,
      content: `Invitation sent to ${email} for ${role} role`,
      recipient_email: email,
      metadata: {
        invitation_id: invitation.id,
        invitation_token: invitationToken,
        role: role
      }
    });

  console.log(`Successfully invited ${email} to organization ${organizationId}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      invitation: invitation,
      invitation_token: invitationToken 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function inviteBulkStaff(organizationId: string, inviterId: string, emails: string[], role: string, customMessage?: string): Promise<Response> {
  console.log(`Inviting bulk staff members: ${emails.length} emails`);
  
  const results = [];
  const errors = [];

  // Get organization details for email
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  for (const email of emails) {
    try {
      // Check if user already exists or has pending invitation
      const { data: existingInvitation } = await supabase
        .from('staff_invitations')
        .select('*')
        .eq('email', email.trim())
        .eq('organization_id', organizationId)
        .is('accepted_at', null)
        .single();

      if (existingInvitation) {
        errors.push(`${email}: Already has pending invitation`);
        continue;
      }

      // Generate invitation token
      const { data: tokenData } = await supabase.rpc('generate_invitation_token');
      const invitationToken = tokenData || `INV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      // Create invitation record
      const { data: invitation, error } = await supabase
        .from('staff_invitations')
        .insert({
          organization_id: organizationId,
          inviter_id: inviterId,
          email: email.trim(),
          role,
          invitation_token: invitationToken,
          metadata: {
            custom_message: customMessage,
            invited_by: inviterId,
            bulk_invitation: true
          }
        })
        .select()
        .single();

      if (error) {
        errors.push(`${email}: ${error.message}`);
        continue;
      }

      // Get inviter details
      const { data: inviter } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', inviterId)
        .single();

      const inviterName = inviter 
        ? `${inviter.first_name} ${inviter.last_name}`.trim() 
        : 'Your Administrator';

      // Send invitation email using dedicated send-invitation-email function
      const emailResponse = await supabase.functions.invoke('send-invitation-email', {
        body: {
          email: email.trim(),
          organizationName: organization?.name || 'Cannabis Training Organization',
          inviterName: inviterName,
          role: role,
          invitationToken: invitationToken,
          expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          customMessage: customMessage
        }
      });

      // Log communication
      await supabase
        .from('communication_logs')
        .insert({
          organization_id: organizationId,
          communication_type: 'bulk_staff_invitation',
          subject: `Bulk Invitation to Cannabis Training Program`,
          content: `Bulk invitation sent to ${email} for ${role} role`,
          recipient_email: email.trim(),
          metadata: {
            invitation_id: invitation.id,
            invitation_token: invitationToken,
            role: role,
            bulk_invitation: true
          }
        });

      results.push({
        email: email.trim(),
        invitation_id: invitation.id,
        invitation_token: invitationToken,
        status: 'sent'
      });

    } catch (error: any) {
      errors.push(`${email}: ${error.message}`);
    }
  }

  console.log(`Bulk invitation completed: ${results.length} successful, ${errors.length} errors`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      invitations_sent: results.length,
      total_emails: emails.length,
      successful_invitations: results,
      errors: errors
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resendInvitation(invitationId: string): Promise<Response> {
  console.log(`Resending invitation: ${invitationId}`);
  
  // Get invitation details
  const { data: invitation, error } = await supabase
    .from('staff_invitations')
    .select(`
      *,
      organizations(name)
    `)
    .eq('id', invitationId)
    .single();

  if (error || !invitation) {
    throw new Error('Invitation not found');
  }

  if (invitation.accepted_at) {
    throw new Error('Invitation has already been accepted');
  }

  // Check if invitation has expired
  if (new Date(invitation.expires_at) < new Date()) {
    // Extend expiration date
    await supabase
      .from('staff_invitations')
      .update({ 
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .eq('id', invitationId);
  }

  // Get inviter details
  const { data: inviter } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('user_id', invitation.inviter_id)
    .single();

  const inviterName = inviter 
    ? `${inviter.first_name} ${inviter.last_name}`.trim() 
    : 'Your Administrator';

  // Resend invitation email using dedicated send-invitation-email function
  const emailResponse = await supabase.functions.invoke('send-invitation-email', {
    body: {
      email: invitation.email,
      organizationName: invitation.organizations?.name || 'Cannabis Training Organization',
      inviterName: inviterName,
      role: invitation.role,
      invitationToken: invitation.invitation_token,
      expiryDate: invitation.expires_at,
      customMessage: invitation.metadata?.custom_message,
      isReminder: true
    }
  });

  // Log communication
  await supabase
    .from('communication_logs')
    .insert({
      organization_id: invitation.organization_id,
      communication_type: 'invitation_reminder',
      subject: `Reminder: Invitation to Cannabis Training Program`,
      content: `Invitation reminder sent to ${invitation.email}`,
      recipient_email: invitation.email,
      metadata: {
        invitation_id: invitation.id,
        invitation_token: invitation.invitation_token,
        is_reminder: true
      }
    });

  console.log(`Successfully resent invitation to ${invitation.email}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Invitation resent successfully',
      recipient: invitation.email
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelInvitation(invitationId: string): Promise<Response> {
  console.log(`Canceling invitation: ${invitationId}`);
  
  // Delete invitation
  const { error } = await supabase
    .from('staff_invitations')
    .delete()
    .eq('id', invitationId);

  if (error) {
    throw new Error(`Error canceling invitation: ${error.message}`);
  }

  console.log(`Successfully canceled invitation ${invitationId}`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Invitation canceled successfully' 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(handler);