import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Canonical Maryland RVT course id — used as fallback if the seat row has no course_id.
const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

const roleMapping: Record<string, string> = {
  dispensary_admin: 'dispensary_manager',
  training_coordinator: 'training_coordinator',
  employee: 'student',
};

const orgRoleMapping: Record<string, string> = {
  // Ensure whatever came in on the invitation is stored on organization_members
  // as one of the values the rest of the app expects.
  dispensary_admin: 'dispensary_admin',
  training_coordinator: 'training_coordinator',
  employee: 'employee',
  staff: 'employee',
  student: 'employee',
};

interface AcceptInvitationRequest {
  token: string;
  action: 'validate' | 'accept';
  userId?: string;
  phone?: string;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = (await req.json()) as AcceptInvitationRequest;
    const { token, action, phone } = body;

    if (!token) {
      return json(400, { success: false, message: 'Invitation token is required' });
    }

    // Hash incoming plaintext token
    const _tokenBytes = new TextEncoder().encode(token);
    const _hashBuf = await crypto.subtle.digest('SHA-256', _tokenBytes);
    const tokenHash = Array.from(new Uint8Array(_hashBuf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Fetch invitation
    const { data: invitation, error: invitationError } = await serviceClient
      .from('staff_invitations')
      .select('id, email, role, expires_at, accepted_at, organization_id, inviter_id, metadata')
      .eq('invitation_token_hash', tokenHash)
      .single();

    if (invitationError || !invitation) {
      console.error('[accept-invitation] Invitation not found:', invitationError);
      return json(404, { success: false, message: 'Invalid or expired invitation' });
    }

    if (invitation.accepted_at) {
      return json(400, { success: false, message: 'This invitation has already been accepted' });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return json(400, { success: false, message: 'This invitation has expired' });
    }

    const { data: organization, error: orgError } = await serviceClient
      .from('organizations')
      .select('id, name, unique_access_key')
      .eq('id', invitation.organization_id)
      .single();

    if (orgError || !organization) {
      console.error('[accept-invitation] Organization not found:', orgError);
      return json(404, { success: false, message: 'Organization not found' });
    }

    const { data: inviter } = await serviceClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', invitation.inviter_id)
      .single();

    const inviterName = inviter
      ? `${inviter.first_name ?? ''} ${inviter.last_name ?? ''}`.trim() || 'Your manager'
      : 'Your manager';

    if (action === 'validate') {
      return json(200, {
        success: true,
        valid: true,
        invitation: {
          email: invitation.email,
          organization_id: organization.id,
          organizationId: organization.id,
          organization_name: organization.name,
          organizationName: organization.name,
          role: invitation.role,
          inviterName,
          accessKey: organization.unique_access_key,
        },
      });
    }

    if (action !== 'accept') {
      return json(400, { success: false, message: 'Invalid action' });
    }

    // ===== ACCEPT PATH: require authenticated user =====
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader) {
      return json(401, { success: false, message: 'Please log in to accept the invitation' });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error('[accept-invitation] Auth failed:', userError);
      return json(401, { success: false, message: 'Invalid session. Please log in again.' });
    }
    const user = userData.user;

    if ((user.email ?? '').toLowerCase() !== invitation.email.toLowerCase()) {
      console.warn('[accept-invitation] Email mismatch', { invite: invitation.email, user: user.email });
      return json(403, {
        success: false,
        message: `This invitation was sent to ${invitation.email}. Please log in with that email address.`,
      });
    }

    const emailLower = invitation.email.toLowerCase();
    const nowIso = new Date().toISOString();

    // 1) Allocate a seat (race-safe select-then-update)
    const { data: availableSeat, error: seatSelectError } = await serviceClient
      .from('rvt_seats')
      .select('id, course_id')
      .eq('organization_id', invitation.organization_id)
      .eq('status', 'available')
      .is('assigned_user_id', null)
      .limit(1)
      .maybeSingle();

    if (seatSelectError) {
      console.error('[accept-invitation] Seat lookup failed:', seatSelectError);
      return json(500, { success: false, message: 'Failed to look up training seat.' });
    }
    if (!availableSeat) {
      return json(400, {
        success: false,
        message: 'No available seats. Your organization needs to purchase more training seats.',
      });
    }

    const { data: assignedSeat, error: assignError } = await serviceClient
      .from('rvt_seats')
      .update({
        assigned_user_id: user.id,
        status: 'assigned',
        assigned_at: nowIso,
      })
      .eq('id', availableSeat.id)
      .eq('status', 'available')
      .select('id, course_id')
      .maybeSingle();

    if (assignError || !assignedSeat) {
      console.error('[accept-invitation] Seat assignment failed:', assignError);
      return json(409, {
        success: false,
        message: 'That seat was just taken. Please try again.',
      });
    }

    const courseId = assignedSeat.course_id || availableSeat.course_id || RVT_COURSE_ID;
    console.log('[accept-invitation] ✅ Seat allocated:', assignedSeat.id);

    // 2) Upsert organization_members
    const orgRole = orgRoleMapping[invitation.role] || 'employee';
    const { error: memberError } = await serviceClient
      .from('organization_members')
      .upsert(
        {
          organization_id: invitation.organization_id,
          user_id: user.id,
          email: emailLower,
          role: orgRole,
          status: 'active',
          updated_at: nowIso,
        },
        { onConflict: 'organization_id,email,role' }
      );

    if (memberError) {
      console.error('[accept-invitation] organization_members upsert failed:', memberError);
      return json(500, { success: false, message: `Failed to activate membership: ${memberError.message}` });
    }
    console.log('[accept-invitation] ✅ organization_members upserted');

    // 3) Upsert course_entitlements (real schema)
    const { error: entError } = await serviceClient
      .from('course_entitlements')
      .upsert(
        {
          user_id: user.id,
          course_id: courseId,
          source: 'seat_allocation',
          status: 'active',
          purchased_at: nowIso,
          metadata: { seat_id: assignedSeat.id, organization_id: invitation.organization_id },
        },
        { onConflict: 'user_id,course_id' }
      );

    if (entError) {
      console.error('[accept-invitation] course_entitlements upsert failed:', entError);
      return json(500, { success: false, message: `Failed to grant course access: ${entError.message}` });
    }
    console.log('[accept-invitation] ✅ course_entitlements upserted');

    // 4) Upsert user_roles
    const userRole = roleMapping[invitation.role] || 'student';
    const { error: roleError } = await serviceClient
      .from('user_roles')
      .upsert(
        { user_id: user.id, role: userRole },
        { onConflict: 'user_id,role', ignoreDuplicates: true }
      );
    if (roleError) {
      console.error('[accept-invitation] user_roles upsert failed:', roleError);
      return json(500, { success: false, message: `Failed to assign role: ${roleError.message}` });
    }

    // 5) Update profile (organization + optional phone)
    const profileUpdate: Record<string, unknown> = {
      organization_id: invitation.organization_id,
      active_organization_id: invitation.organization_id,
      updated_at: nowIso,
    };
    if (phone) profileUpdate.phone = phone;

    const { error: profileError } = await serviceClient
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', user.id);

    if (profileError) {
      console.error('[accept-invitation] profiles update failed:', profileError);
      return json(500, { success: false, message: `Failed to update profile: ${profileError.message}` });
    }

    // 6) Upsert user_learning_journey
    const { error: journeyError } = await serviceClient
      .from('user_learning_journey')
      .upsert(
        {
          user_id: user.id,
          organization_id: invitation.organization_id,
          current_stage: 'enrolled',
          stage_entered_at: nowIso,
          last_activity_at: nowIso,
          completion_percentage: 0,
          modules_completed: 0,
          exam_attempts: 0,
          at_risk_flag: false,
          updated_at: nowIso,
        },
        { onConflict: 'user_id,organization_id', ignoreDuplicates: false }
      );
    if (journeyError) {
      console.error('[accept-invitation] user_learning_journey upsert failed:', journeyError);
      // Non-fatal: continue but report.
    }

    // 7) Mark invitation accepted
    const { error: acceptError } = await serviceClient
      .from('staff_invitations')
      .update({
        accepted_at: nowIso,
        metadata: { ...(invitation.metadata ?? {}), accepted_user_id: user.id },
      })
      .eq('id', invitation.id);

    if (acceptError) {
      console.error('[accept-invitation] staff_invitations update failed:', acceptError);
      return json(500, { success: false, message: `Failed to mark invitation accepted: ${acceptError.message}` });
    }

    console.log('[accept-invitation] ✅ Invitation fully accepted for user:', user.id);

    return json(200, {
      success: true,
      message: 'Invitation accepted successfully and training seat allocated',
      data: {
        organization_id: invitation.organization_id,
        organization_name: organization.name,
        course_id: courseId,
        seat_id: assignedSeat.id,
        role: invitation.role,
      },
    });
  } catch (error) {
    console.error('[accept-invitation] Unexpected error:', error);
    return json(500, {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred',
    });
  }
});
