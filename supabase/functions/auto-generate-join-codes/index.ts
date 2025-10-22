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
    const { check_id } = await req.json();
    const startTime = Date.now();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the check details
    const { data: check, error: checkError } = await supabaseClient
      .from('system_integrity_checks')
      .select('*')
      .eq('id', check_id)
      .single();

    if (checkError || !check) {
      throw new Error('Check not found');
    }

    if (check.check_type !== 'missing_join_code') {
      throw new Error('Invalid check type for this fix');
    }

    const { organization_id } = check.technical_details;

    // Invoke the generate-join-code function
    const { data: joinCodeData, error: joinCodeError } = await supabaseClient.functions.invoke(
      'generate-join-code',
      {
        body: { organization_id }
      }
    );

    if (joinCodeError) {
      throw new Error(`Failed to generate join code: ${joinCodeError.message}`);
    }

    if (!joinCodeData.success) {
      throw new Error(joinCodeData.message || 'Join code generation failed');
    }

    // Mark check as fixed
    await supabaseClient
      .from('system_integrity_checks')
      .update({
        status: 'fixed',
        resolved_at: new Date().toISOString()
      })
      .eq('id', check_id);

    // Log the fix
    const duration = Date.now() - startTime;
    await supabaseClient
      .from('system_integrity_fixes')
      .insert({
        check_id: check_id,
        fix_type: 'join_code_generation',
        fix_action: 'Generated join code for organization',
        execution_mode: 'automatic',
        success: true,
        execution_duration_ms: duration,
        changes_made: {
          organization_id: organization_id,
          join_code: joinCodeData.code,
          expires_at: joinCodeData.expiresAt
        },
        rollback_available: true,
        rollback_data: {
          join_code_id: joinCodeData.id,
          can_deactivate: true
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Join code generated successfully',
        join_code: joinCodeData.code,
        duration_ms: duration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-fix error:', error);

    // Log failed fix attempt
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { check_id } = await req.json();

      await supabaseClient
        .from('system_integrity_fixes')
        .insert({
          check_id: check_id,
          fix_type: 'join_code_generation',
          fix_action: 'Attempted to generate join code',
          execution_mode: 'automatic',
          success: false,
          error_details: {
            message: error.message,
            stack: error.stack
          }
        });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
