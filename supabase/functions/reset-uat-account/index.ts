import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (!roles?.some(r => r.role === 'admin')) {
      throw new Error('Admin access required');
    }

    const { userId, resetSeats = false } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    console.log(`[UAT Reset] Starting reset for user: ${userId}`);

    // 1. Delete user progress
    const { error: progressError } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', userId);

    if (progressError) {
      console.error('[UAT Reset] Progress deletion error:', progressError);
    } else {
      console.log('[UAT Reset] Deleted user_progress records');
    }

    // 2. Delete exam topic scores first (FK dependency)
    const { data: examAttempts } = await supabase
      .from('exam_attempts')
      .select('id')
      .eq('user_id', userId);

    if (examAttempts && examAttempts.length > 0) {
      const attemptIds = examAttempts.map(a => a.id);
      
      const { error: scoresError } = await supabase
        .from('exam_topic_scores')
        .delete()
        .in('exam_attempt_id', attemptIds);

      if (scoresError) {
        console.error('[UAT Reset] Exam scores deletion error:', scoresError);
      } else {
        console.log('[UAT Reset] Deleted exam_topic_scores records');
      }
    }

    // 3. Delete exam attempts
    const { error: examError } = await supabase
      .from('exam_attempts')
      .delete()
      .eq('user_id', userId);

    if (examError) {
      console.error('[UAT Reset] Exam deletion error:', examError);
    } else {
      console.log('[UAT Reset] Deleted exam_attempts records');
    }

    // 4. Delete certificates
    const { error: certError } = await supabase
      .from('certificates')
      .delete()
      .eq('user_id', userId);

    if (certError) {
      console.error('[UAT Reset] Certificate deletion error:', certError);
    } else {
      console.log('[UAT Reset] Deleted certificates');
    }

    // 5. Reset user journey state
    const { error: journeyError } = await supabase
      .from('user_journey_state')
      .update({
        current_stage: 'new_user',
        modules_completed: 0,
        current_module_id: null,
        last_completed_module_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (journeyError) {
      console.error('[UAT Reset] Journey state reset error:', journeyError);
    } else {
      console.log('[UAT Reset] Reset user_journey_state');
    }

    // 6. Optionally unassign seat (keep it available in org pool)
    if (resetSeats) {
      const { error: seatError } = await supabase
        .from('rvt_seats')
        .update({
          status: 'available',
          assigned_user_id: null,
          assigned_at: null
        })
        .eq('assigned_user_id', userId);

      if (seatError) {
        console.error('[UAT Reset] Seat unassignment error:', seatError);
      } else {
        console.log('[UAT Reset] Unassigned seat');
      }
    }

    // 7. Update UAT account tracking
    const { error: trackingError } = await supabase
      .from('uat_accounts')
      .update({
        last_reset_at: new Date().toISOString(),
        reset_count: supabase.raw('reset_count + 1')
      })
      .eq('user_id', userId);

    if (trackingError) {
      console.error('[UAT Reset] Tracking update error:', trackingError);
    } else {
      console.log('[UAT Reset] Updated uat_accounts tracking');
    }

    console.log('[UAT Reset] Reset completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'UAT account reset successfully',
        userId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[UAT Reset] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
