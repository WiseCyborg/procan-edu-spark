import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AcceptInvitationRequest {
  token: string;
  action: 'validate' | 'accept';
  userId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token, action, userId }: AcceptInvitationRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: 'Invitation token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Hash incoming plaintext token; plaintext is not stored at rest
    const _tokenBytes = new TextEncoder().encode(token);
    const _hashBuf = await crypto.subtle.digest('SHA-256', _tokenBytes);
    const tokenHash = Array.from(new Uint8Array(_hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('staff_invitations')
      .select(`
        id,
        email,
        role,
        expires_at,
        accepted_at,
        organization_id,
        inviter_id,
        metadata
      `)
      .eq('invitation_token_hash', tokenHash)
      .single();

    if (invitationError || !invitation) {
      console.error('Invitation not found:', invitationError);
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid or expired invitation' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invitation.accepted_at) {
      return new Response(
        JSON.stringify({ success: false, message: 'This invitation has already been accepted' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, message: 'This invitation has expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, unique_access_key')
      .eq('id', invitation.organization_id)
      .single();

    if (orgError || !organization) {
      console.error('Organization not found:', orgError);
      return new Response(
        JSON.stringify({ success: false, message: 'Organization not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get inviter details
    const { data: inviter, error: inviterError } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', invitation.inviter_id)
      .single();

    const inviterName = inviter 
      ? `${inviter.first_name} ${inviter.last_name}` 
      : 'Your manager';

    if (action === 'validate') {
      // Just return invitation details for validation
      return new Response(
        JSON.stringify({
          success: true,
          invitation: {
            email: invitation.email,
            organizationId: organization.id,
            organizationName: organization.name,
            role: invitation.role,
            inviterName: inviterName,
            accessKey: organization.unique_access_key
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'accept') {
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, message: 'User ID is required to accept invitation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Seats are pinned to the Maryland RVT course (mirrors paypal-webhook seat
      // issuance and the frontend course-access guard in App.tsx — centralize later).
      const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

      const { data: defaultCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('id', RVT_COURSE_ID)
        .eq('is_active', true)
        .maybeSingle();

      if (!defaultCourse) {
        return new Response(
          JSON.stringify({ success: false, message: 'No active course found' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // **Allocate seat to user atomically**
      try {
        const { data: seatId, error: seatError } = await supabase
          .rpc('allocate_seat_to_user', {
            org_id: invitation.organization_id,
            user_id: userId,
            course_id: RVT_COURSE_ID
          });

        if (seatError) {
          console.error('No available seats:', seatError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'No available seats. Your organization needs to purchase more training seats.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Seat ${seatId} allocated to user ${userId}`);
      } catch (err) {
        console.error('Error allocating seat:', err);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to allocate training seat. Please contact your manager.' 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('staff_invitations')
        .update({ 
          accepted_at: new Date().toISOString(),
          metadata: {
            ...invitation.metadata,
            accepted_user_id: userId
          }
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
        return new Response(
          JSON.stringify({ success: false, message: 'Failed to accept invitation' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Invitation ${invitation.id} accepted by user ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Invitation accepted successfully and training seat allocated'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in accept-invitation function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
