import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RetrainingRequest {
  incidentId: string;
  incidentType: string;
  employeeUserId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { incidentId, incidentType, employeeUserId, severity }: RetrainingRequest = await req.json();

    console.log(`[incident-retraining-trigger] Processing incident ${incidentId}`);
    console.log(`[incident-retraining-trigger] Type: ${incidentType}, Severity: ${severity}, Employee: ${employeeUserId || 'none'}`);

    // Only auto-assign for high/critical severity
    if (severity !== 'high' && severity !== 'critical') {
      console.log(`[incident-retraining-trigger] Severity ${severity} does not require auto-retraining`);
      return new Response(
        JSON.stringify({ success: true, message: 'No auto-retraining required for this severity' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the incident to find organization and reporter
    const { data: incident, error: incidentError } = await supabase
      .from('compliance_incidents')
      .select('organization_id, reported_by, employee_user_id')
      .eq('id', incidentId)
      .single();

    if (incidentError || !incident) {
      console.error('[incident-retraining-trigger] Incident not found:', incidentError);
      throw new Error('Incident not found');
    }

    // Get mapped modules for this incident type
    const { data: mappings, error: mappingError } = await supabase
      .from('incident_module_mappings')
      .select('module_id, is_required')
      .eq('incident_type', incidentType)
      .eq('is_required', true);

    if (mappingError) {
      console.error('[incident-retraining-trigger] Error fetching mappings:', mappingError);
      throw new Error('Failed to fetch module mappings');
    }

    if (!mappings || mappings.length === 0) {
      console.log(`[incident-retraining-trigger] No module mappings found for incident type: ${incidentType}`);
      
      // Fallback: assign general compliance module (module 3)
      const { data: fallbackModule } = await supabase
        .from('course_modules')
        .select('id')
        .eq('module_number', 3)
        .single();

      if (fallbackModule) {
        mappings?.push({ module_id: fallbackModule.id, is_required: true });
      }
    }

    const targetUserId = employeeUserId || incident.employee_user_id;
    if (!targetUserId) {
      console.log('[incident-retraining-trigger] No employee user ID to assign retraining to');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No employee specified for retraining assignment',
          assigned: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate due date based on severity
    const daysUntilDue = severity === 'critical' ? 3 : 7;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + daysUntilDue);

    // Create retraining assignments
    const assignmentsToCreate = (mappings || []).map((mapping) => ({
      incident_id: incidentId,
      user_id: targetUserId,
      module_id: mapping.module_id,
      assigned_by: incident.reported_by,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
    }));

    if (assignmentsToCreate.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No modules to assign',
          assigned: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: assignments, error: assignError } = await supabase
      .from('incident_retraining_assignments')
      .upsert(assignmentsToCreate, { 
        onConflict: 'incident_id,user_id,module_id',
        ignoreDuplicates: true 
      })
      .select();

    if (assignError) {
      console.error('[incident-retraining-trigger] Error creating assignments:', assignError);
      throw new Error('Failed to create retraining assignments');
    }

    console.log(`[incident-retraining-trigger] Created ${assignments?.length || 0} retraining assignments`);

    // Get employee details for notification
    const { data: employee } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('user_id', targetUserId)
      .single();

    // Log communication
    if (employee?.email) {
      await supabase.from('communication_logs').insert({
        communication_type: 'retraining_assignment',
        recipient_email: employee.email,
        subject: `Required Retraining: ${incidentType.replace(/_/g, ' ')}`,
        content: `You have been assigned ${assignmentsToCreate.length} module(s) to complete by ${dueDate.toLocaleDateString()} due to a ${severity} severity incident.`,
        delivery_status: 'pending',
        organization_id: incident.organization_id,
        user_id: targetUserId,
        metadata: {
          incident_id: incidentId,
          incident_type: incidentType,
          severity,
          modules_assigned: assignmentsToCreate.length,
          due_date: dueDate.toISOString(),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${assignments?.length || 0} retraining assignments`,
        assigned: assignments?.length || 0,
        dueDate: dueDate.toISOString(),
        employee: employee ? `${employee.first_name} ${employee.last_name}` : 'Unknown',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[incident-retraining-trigger] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
