import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('Executing workflow automations...');

    const { data: workflows } = await supabase
      .from('workflow_automations')
      .select('*')
      .eq('enabled', true);

    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ success: true, workflows_executed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let totalExecuted = 0;
    let totalNotifications = 0;

    for (const workflow of workflows) {
      console.log(`Processing workflow: ${workflow.name}`);
      
      try {
        const result = await executeWorkflow(workflow, supabase);
        totalExecuted++;
        totalNotifications += result.notifications_sent;
        
        console.log(`Workflow "${workflow.name}" sent ${result.notifications_sent} notifications`);
      } catch (workflowError) {
        console.error(`Workflow "${workflow.name}" failed:`, workflowError);
      }
    }

    await supabase.from('ai_agent_runs').insert({
      agent_name: 'Workflow Automation Executor',
      agent_type: 'notification_orchestrator',
      execution_status: 'success',
      items_processed: workflows.length,
      actions_taken: [`${totalNotifications} notifications sent`],
      metadata: { workflows_executed: totalExecuted, total_notifications: totalNotifications }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        workflows_executed: totalExecuted,
        notifications_sent: totalNotifications
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in execute-workflow-automations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function executeWorkflow(workflow: any, supabase: any) {
  let notificationsSent = 0;

  // Certificate Expiry Workflow
  if (workflow.trigger_type === 'scheduled' && workflow.name.toLowerCase().includes('certificate')) {
    const advanceDays = workflow.actions?.send_notification?.advance_days || [30, 14, 7, 1];
    
    for (const days of advanceDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      const { data: expiringCerts } = await supabase
        .from('certificates')
        .select(`
          user_id,
          expiry_date,
          profiles!inner(user_id, first_name, last_name)
        `)
        .eq('is_revoked', false)
        .gte('expiry_date', targetDateStr)
        .lt('expiry_date', new Date(targetDate.getTime() + 24 * 60 * 60 * 1000).toISOString());
      
      for (const cert of expiringCerts || []) {
        const { data: userAuth } = await supabase.auth.admin.getUserById(cert.user_id);
        
        if (userAuth?.user?.email) {
          await supabase.from('notification_queue').insert({
            user_id: cert.user_id,
            recipient_email: userAuth.user.email,
            subject: `Certificate Expiring in ${days} Days - Renewal Required`,
            message: `Hi ${cert.profiles.first_name}, your ProCann certificate expires on ${cert.expiry_date}. Please renew to maintain compliance.`,
            scheduled_for: new Date().toISOString(),
            priority: days <= 7 ? 'high' : 'medium'
          });
          notificationsSent++;
        }
      }
    }
  }

  return { notifications_sent: notificationsSent };
}
