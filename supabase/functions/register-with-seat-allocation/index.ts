import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side validation schema
const RegistrationSchema = z.object({
  email: z.string().trim().email().max(255).toLowerCase(),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/),
  lastName: z.string().trim().min(1).max(50).regex(/^[a-zA-Z\s'-]+$/),
  phone: z.string().trim().regex(/^\+?1?\s*\(?([0-9]{3})\)?[\s.-]?([0-9]{3})[\s.-]?([0-9]{4})$/),
  organizationId: z.string().uuid(),
  organizationName: z.string().trim().min(2).max(200),
  joinCode: z.string().trim().length(8).regex(/^[A-Z0-9]+$/i).optional(),
  invitationToken: z.string().trim().min(10).max(100).optional()
});

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

    const rawData = await req.json();
    
    // VALIDATE INPUT
    const validationResult = RegistrationSchema.safeParse(rawData);
    
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
    
    // Use validated data
    const requestData = validationResult.data;
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

    // Check rate limit: 10 registration attempts per hour per IP
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    const { data: rateLimitData } = await supabaseClient.rpc('check_rate_limit', {
      _user_id: null,
      _action_type: `register_employee_${clientIp}`,
      _max_requests: 10,
      _window_minutes: 60
    });

    if (rateLimitData && rateLimitData.length > 0) {
      const remaining = rateLimitData[0].remaining;
      if (remaining <= 0) {
        console.warn(`[RATE LIMIT] IP ${clientIp} exceeded registration limit`);
        return new Response(
          JSON.stringify({ 
            error: 'Too many registration attempts. Please try again in 1 hour.',
            code: 'RATE_LIMIT_EXCEEDED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // VALIDATE: Check join code has available seats (if using join code)
    if (joinCode) {
      console.log('[ATOMIC REGISTRATION] Validating join code has available seats:', joinCode);
      
      const { data: hasSeats, error: validateError } = await supabaseClient
        .rpc('validate_join_code_has_seats', { p_join_code: joinCode });

      if (validateError) {
        console.error('[ATOMIC REGISTRATION] Join code validation error:', validateError);
        throw new Error('Failed to validate join code');
      }

      if (!hasSeats) {
        console.error('[ATOMIC REGISTRATION] Join code has no available seats');
        return new Response(
          JSON.stringify({ 
            error: 'This join code has reached its maximum usage limit or no seats are available. Please contact your manager to purchase more seats.',
            code: 'JOIN_CODE_EXHAUSTED'
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      console.log('[ATOMIC REGISTRATION] Join code validated - seats available');
    }

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

    // STEP 3: Create user account with retry logic (Gate 7 fix)
    let authData = null;
    let authError = null;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[ATOMIC REGISTRATION] Auth attempt ${attempt}/${maxRetries}`);
      
      const result = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          organization_id: organizationId
        }
      });

      if (result.data?.user) {
        authData = result.data;
        authError = null;
        break;
      }

      authError = result.error;
      console.error(`[ATOMIC REGISTRATION] Auth attempt ${attempt} failed:`, authError);
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    if (authError || !authData?.user) {
      console.error('[ATOMIC REGISTRATION] All auth attempts failed:', authError);
      
      // ROLLBACK: Release seat using proper RPC
      const { error: deallocError } = await supabaseClient
        .rpc('deallocate_seat', { seat_id_param: seatId });
      
      if (deallocError) {
        console.error('[ATOMIC REGISTRATION] Seat deallocation failed:', deallocError);
      } else {
        console.log('[ATOMIC REGISTRATION] Seat deallocated successfully');
      }
      
      throw new Error(`Account creation failed after ${maxRetries} attempts: ${authError?.message}`);
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

    // STEP 10: Queue welcome email (non-blocking, with idempotency)
    const welcomeJobIdempotencyKey = `welcome_${authData.user.id}_${Date.now()}`;
    try {
      const { data: jobData, error: jobError } = await supabaseClient.rpc('queue_job', {
        p_job_type: 'send_welcome_email',
        p_payload: {
          email: email,
          firstName: firstName,
          lastName: lastName,
          userId: authData.user.id,
          organizationName: organizationName
        },
        p_idempotency_key: welcomeJobIdempotencyKey,
        p_organization_id: organizationId,
        p_max_retries: 3
      });

      if (jobError) {
        console.error('[ATOMIC REGISTRATION] Failed to queue welcome email:', jobError);
      } else {
        console.log('[ATOMIC REGISTRATION] Welcome email queued with job ID:', jobData);
      }
    } catch (emailError) {
      console.error('[ATOMIC REGISTRATION] Welcome email queue error:', emailError);
      // Don't fail registration if email queueing fails
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
