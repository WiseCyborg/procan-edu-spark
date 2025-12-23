import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BulkRetrainingRequest {
  organization_id: string;
  module_id: string;
  employee_user_ids: string[];
  reason: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: BulkRetrainingRequest = await req.json();
    const { organization_id, module_id, employee_user_ids, reason } = body;

    console.log(`[bulk-assign-retraining] Processing request for org ${organization_id}`);
    console.log(`[bulk-assign-retraining] Module: ${module_id}, Employees: ${employee_user_ids.length}`);

    // Validate inputs
    if (!organization_id || !module_id || !employee_user_ids?.length || !reason) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to this organization (manager/coordinator/admin)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = userRoles?.map(r => r.role) || [];
    const isAdmin = roles.includes('admin');
    const isOrgMember = userProfile?.organization_id === organization_id;
    const isManager = roles.includes('dispensary_manager') || roles.includes('training_coordinator');

    if (!isAdmin && (!isOrgMember || !isManager)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Must be org manager or admin' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get module details
    const { data: module } = await supabase
      .from('course_modules')
      .select('id, title, module_number')
      .eq('id', module_id)
      .single();

    if (!module) {
      return new Response(
        JSON.stringify({ success: false, error: 'Module not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let assignedCount = 0;
    let signoffsInvalidated = 0;
    const errors: string[] = [];

    // Process each employee
    for (const employeeUserId of employee_user_ids) {
      try {
        // Verify employee belongs to organization
        const { data: empProfile } = await supabase
          .from('profiles')
          .select('organization_id, first_name, last_name')
          .eq('user_id', employeeUserId)
          .single();

        if (empProfile?.organization_id !== organization_id) {
          errors.push(`Employee ${employeeUserId} not in organization`);
          continue;
        }

        // Create retraining event
        const { error: insertError } = await supabase
          .from('retraining_events')
          .insert({
            organization_id,
            employee_user_id: employeeUserId,
            module_id,
            reason,
            assigned_by: user.id,
            status: 'pending',
          });

        if (insertError) {
          console.error(`[bulk-assign-retraining] Error inserting for ${employeeUserId}:`, insertError);
          errors.push(`Failed to assign ${empProfile?.first_name || employeeUserId}`);
          continue;
        }

        assignedCount++;

        // Existing trigger `invalidate_signoffs_on_retraining` should handle signoff invalidation
        // But let's also manually invalidate to be sure
        const { data: invalidated } = await supabase
          .from('supervisor_signoffs')
          .update({ 
            valid: false, 
            invalidated_at: new Date().toISOString(),
            invalidation_reason: `Retraining assigned: ${reason}`
          })
          .eq('organization_id', organization_id)
          .eq('employee_user_id', employeeUserId)
          .eq('module_id', module_id)
          .eq('valid', true)
          .select('id');

        signoffsInvalidated += invalidated?.length || 0;

        console.log(`[bulk-assign-retraining] Assigned retraining to ${empProfile?.first_name} ${empProfile?.last_name}`);
      } catch (empError) {
        console.error(`[bulk-assign-retraining] Error processing ${employeeUserId}:`, empError);
        errors.push(`Error processing employee ${employeeUserId}`);
      }
    }

    console.log(`[bulk-assign-retraining] Complete: ${assignedCount} assigned, ${signoffsInvalidated} signoffs invalidated`);

    return new Response(
      JSON.stringify({
        success: true,
        assigned_count: assignedCount,
        signoffs_invalidated: signoffsInvalidated,
        module_title: module.title,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[bulk-assign-retraining] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
