import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  organizationId: string;
  organizationName: string;
  joinCode?: string;
  invitationToken?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestData: RegistrationRequest = await req.json();
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      organizationId, 
      organizationName,
      joinCode,
      invitationToken 
    } = requestData;

    console.log('[ATOMIC REGISTRATION] Starting registration for:', email);

    // STEP 1: Get default course ID
    const { data: courseData, error: courseError } = await supabaseClient
      .from('courses')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (courseError || !courseData) {
      throw new Error('No active course found');
    }

    // STEP 2: ATOMICALLY ALLOCATE SEAT FIRST (using FOR UPDATE SKIP LOCKED)
    // This is the CRITICAL step - if this fails, registration stops
    console.log('[ATOMIC REGISTRATION] Attempting seat allocation...');
    
    const { data: seatId, error: seatError } = await supabaseClient
      .rpc('allocate_seat_to_user', {
        org_id: organizationId,
        user_id: '00000000-0000-0000-0000-000000000000', // Temporary placeholder
        course_id: courseData.id
      });

    if (seatError || !seatId) {
      console.error('[ATOMIC REGISTRATION] Seat allocation failed:', seatError);
      return new Response(
        JSON.stringify({ 
          error: 'No training seats available. Please contact your manager to purchase more seats.',
          code: 'NO_SEATS_AVAILABLE'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[ATOMIC REGISTRATION] Seat allocated successfully:', seatId);

    // STEP 3: Create user account (only after seat is secured)
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        organization_id: organizationId
      }
    });

    if (authError || !authData.user) {
      console.error('[ATOMIC REGISTRATION] Account creation failed:', authError);
      
      // ROLLBACK: Release the seat we allocated
      await supabaseClient
        .from('rvt_seats')
        .update({ 
          status: 'available', 
          assigned_user_id: null,
          assigned_at: null 
        })
        .eq('id', seatId);
      
      throw new Error(`Account creation failed: ${authError?.message}`);
    }

    console.log('[ATOMIC REGISTRATION] User account created:', authData.user.id);

    // STEP 4: Update seat with actual user_id
    const { error: seatUpdateError } = await supabaseClient
      .from('rvt_seats')
      .update({ assigned_user_id: authData.user.id })
      .eq('id', seatId);

    if (seatUpdateError) {
      console.error('[ATOMIC REGISTRATION] Seat update failed:', seatUpdateError);
    }

    // STEP 5: Assign student role
    const { error: roleError } = await supabaseClient
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'student'
      });

    if (roleError) {
      console.error('[ATOMIC REGISTRATION] Role assignment failed:', roleError);
    }

    // STEP 6: Update profile
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ 
        organization_id: organizationId,
        phone: phone 
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.error('[ATOMIC REGISTRATION] Profile update failed:', profileError);
    }

    // STEP 7: Increment join code usage (if applicable)
    if (joinCode) {
      const { data: currentJoinCode } = await supabaseClient
        .from('rvt_join_codes')
        .select('current_uses')
        .eq('code', joinCode)
        .single();

      if (currentJoinCode) {
        await supabaseClient
          .from('rvt_join_codes')
          .update({ current_uses: currentJoinCode.current_uses + 1 })
          .eq('code', joinCode);
      }
    }

    // STEP 8: Create enrollment with 30-day deadline
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 30);
    
    await supabaseClient
      .from('rvt_enrollments' as any)
      .insert({
        user_id: authData.user.id,
        organization_id: organizationId,
        course_id: courseData.id,
        deadline_at: deadlineDate.toISOString(),
      });

    // STEP 9: Accept invitation (if applicable)
    if (invitationToken) {
      await supabaseClient.functions.invoke('accept-invitation', {
        body: { 
          token: invitationToken, 
          action: 'accept',
          userId: authData.user.id
        }
      });
    }

    // STEP 10: Send welcome email (non-blocking)
    try {
      await supabaseClient.functions.invoke('send-welcome-email', {
        body: {
          email: email,
          firstName: firstName,
          lastName: lastName,
        }
      });
    } catch (emailError) {
      console.error('[ATOMIC REGISTRATION] Welcome email failed:', emailError);
      // Don't fail registration if email fails
    }

    // STEP 11: Create learning journey tracking
    await supabaseClient.from('user_learning_journey').insert({
      user_id: authData.user.id,
      organization_id: organizationId,
      current_stage: 'account_created',
      completion_percentage: 0,
      modules_completed: 0,
      exam_attempts: 0
    });

    console.log('[ATOMIC REGISTRATION] Registration complete for:', email);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: authData.user.id,
        message: `Welcome to ${organizationName}! Check your email for next steps.`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[ATOMIC REGISTRATION] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Registration failed',
        code: 'REGISTRATION_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
