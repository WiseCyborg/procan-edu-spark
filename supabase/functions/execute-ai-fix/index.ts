import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      throw new Error('Admin access required');
    }

    const { planId, checkId } = await req.json();

    // Fetch the AI fix plan
    const { data: fixPlan, error: planError } = await supabase
      .from('ai_fix_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !fixPlan) {
      throw new Error('Fix plan not found');
    }

    // Fetch the check details
    const { data: check, error: checkError } = await supabase
      .from('system_integrity_checks')
      .select('*')
      .eq('id', checkId)
      .single();

    if (checkError || !check) {
      throw new Error('Integrity check not found');
    }

    console.log(`Executing AI fix for: ${check.check_type}`);

    // Mark plan as approved
    await supabase
      .from('ai_fix_plans')
      .update({
        approved_by: user.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', planId);

    const executionSteps: any[] = [];
    const startTime = Date.now();

    try {
      // Route to appropriate fix function based on check type
      let fixResult;

      if (check.check_type === 'missing_manager_account') {
        executionSteps.push({ step: 'Routing to auto-fix-manager-accounts', status: 'started', timestamp: new Date().toISOString() });
        
        const { data, error } = await supabase.functions.invoke('auto-fix-manager-accounts', {
          body: { checkId }
        });

        if (error) throw error;
        fixResult = data;
        executionSteps.push({ step: 'Manager account fix completed', status: 'success', timestamp: new Date().toISOString(), result: data });

      } else if (check.check_type === 'missing_join_code') {
        executionSteps.push({ step: 'Routing to auto-generate-join-codes', status: 'started', timestamp: new Date().toISOString() });
        
        const { data, error } = await supabase.functions.invoke('auto-generate-join-codes', {
          body: { checkId }
        });

        if (error) throw error;
        fixResult = data;
        executionSteps.push({ step: 'Join code generation completed', status: 'success', timestamp: new Date().toISOString(), result: data });

      } else if (check.check_type === 'seat_mismatch') {
        executionSteps.push({ step: 'Routing to reconcile-seats', status: 'started', timestamp: new Date().toISOString() });
        
        const { data, error } = await supabase.functions.invoke('reconcile-seats', {
          body: { checkId }
        });

        if (error) throw error;
        fixResult = data;
        executionSteps.push({ step: 'Seat reconciliation completed', status: 'success', timestamp: new Date().toISOString(), result: data });

      } else {
        throw new Error(`No automated fix available for check type: ${check.check_type}`);
      }

      // Update the check status to resolved
      await supabase
        .from('system_integrity_checks')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', checkId);

      executionSteps.push({ step: 'Check marked as resolved', status: 'success', timestamp: new Date().toISOString() });

      // Log the fix execution
      const executionTime = Date.now() - startTime;
      await supabase
        .from('system_integrity_fixes')
        .insert({
          check_id: checkId,
          fix_type: check.check_type,
          executed_by: user.id,
          success: true,
          ai_plan_id: planId,
          execution_steps: executionSteps,
          verification_result: { verified: true, fixResult },
          user_approved_at: new Date().toISOString()
        });

      console.log(`Fix executed successfully in ${executionTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          executionSteps,
          executionTimeMs: executionTime,
          fixResult
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (fixError) {
      console.error('Fix execution failed:', fixError);
      
      executionSteps.push({ 
        step: 'Fix execution failed', 
        status: 'error', 
        timestamp: new Date().toISOString(),
        error: fixError instanceof Error ? fixError.message : 'Unknown error'
      });

      // Log the failed attempt
      await supabase
        .from('system_integrity_fixes')
        .insert({
          check_id: checkId,
          fix_type: check.check_type,
          executed_by: user.id,
          success: false,
          error_message: fixError instanceof Error ? fixError.message : 'Unknown error',
          ai_plan_id: planId,
          execution_steps: executionSteps,
          user_approved_at: new Date().toISOString()
        });

      throw fixError;
    }

  } catch (error) {
    console.error('Error in execute-ai-fix:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});