import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RENEWAL_DEADLINE = new Date('2026-01-01');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting RVT renewal monitoring...');
    
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Only run October - December
    if (currentMonth < 9) { // October is month 9
      console.log('Not renewal season yet (Oct-Dec). Skipping...');
      return new Response(
        JSON.stringify({ success: true, message: 'Not renewal season' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all users with certificates expiring before Jan 1
    const { data: users, error: usersError } = await supabase
      .from('certificates')
      .select(`
        user_id,
        expiry_date,
        certificate_number,
        profiles!inner(first_name, last_name, organization_id),
        user_progress!inner(progress_percentage)
      `)
      .lte('expiry_date', RENEWAL_DEADLINE.toISOString())
      .eq('is_revoked', false);

    if (usersError) throw usersError;

    let processed = 0;
    let atRisk = 0;
    let remindersQueued = 0;

    for (const user of users || []) {
      processed++;
      
      const daysUntilDeadline = Math.floor(
        (RENEWAL_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const progress = user.user_progress?.progress_percentage || 0;
      
      // Calculate risk level
      let riskLevel = 'low';
      if (daysUntilDeadline < 30 && progress < 25) {
        riskLevel = 'critical';
      } else if (daysUntilDeadline < 60 && progress < 50) {
        riskLevel = 'high';
      } else if (daysUntilDeadline < 90 && progress < 75) {
        riskLevel = 'medium';
      }

      // Update or create renewal tracking record
      const { data: tracking, error: trackingError } = await supabase
        .from('rvt_renewal_tracking')
        .upsert({
          user_id: user.user_id,
          certificate_expiry: user.expiry_date,
          renewal_required_by: RENEWAL_DEADLINE.toISOString(),
          current_progress: progress,
          risk_level: riskLevel,
          completed_renewal: progress >= 100,
          updated_at: now.toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (trackingError) {
        console.error('Error updating tracking:', trackingError);
        continue;
      }

      // Queue reminders based on risk level and timing
      let shouldSendReminder = false;
      let reminderType = 'standard';

      if (riskLevel === 'critical') {
        // Critical: Send if no reminder in last 7 days
        const daysSinceReminder = tracking.last_reminder_sent 
          ? Math.floor((now.getTime() - new Date(tracking.last_reminder_sent).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        shouldSendReminder = daysSinceReminder >= 7;
        reminderType = 'urgent';
        atRisk++;
      } else if (riskLevel === 'high') {
        // High: Send if no reminder in last 14 days
        const daysSinceReminder = tracking.last_reminder_sent 
          ? Math.floor((now.getTime() - new Date(tracking.last_reminder_sent).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        shouldSendReminder = daysSinceReminder >= 14;
        reminderType = 'important';
        atRisk++;
      } else if (riskLevel === 'medium') {
        // Medium: Send monthly
        const daysSinceReminder = tracking.last_reminder_sent 
          ? Math.floor((now.getTime() - new Date(tracking.last_reminder_sent).getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        shouldSendReminder = daysSinceReminder >= 30;
      }

      if (shouldSendReminder) {
        // Queue notification
        await supabase.rpc('queue_job', {
          job_type: 'rvt_renewal_reminder',
          job_data: {
            user_id: user.user_id,
            reminder_type: reminderType,
            days_remaining: daysUntilDeadline,
            progress: progress,
            risk_level: riskLevel
          }
        });

        // Update last reminder sent
        await supabase
          .from('rvt_renewal_tracking')
          .update({
            last_reminder_sent: now.toISOString(),
            reminder_count: (tracking.reminder_count || 0) + 1
          })
          .eq('user_id', user.user_id);

        remindersQueued++;
      }

      // Notify manager if critical and not yet notified
      if (riskLevel === 'critical' && !tracking.manager_notified && user.profiles?.organization_id) {
        await supabase.rpc('queue_job', {
          job_type: 'notify_manager_at_risk_renewal',
          job_data: {
            organization_id: user.profiles.organization_id,
            user_id: user.user_id,
            user_name: `${user.profiles.first_name} ${user.profiles.last_name}`,
            days_remaining: daysUntilDeadline,
            progress: progress
          }
        });

        await supabase
          .from('rvt_renewal_tracking')
          .update({ manager_notified: true })
          .eq('user_id', user.user_id);
      }
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'RVT Renewal Monitor',
      agent_type: 'renewal_tracking',
      execution_status: 'success',
      items_processed: processed,
      actions_taken: {
        at_risk_count: atRisk,
        reminders_queued: remindersQueued
      },
      metadata: {
        renewal_deadline: RENEWAL_DEADLINE.toISOString(),
        days_until_deadline: Math.floor(
          (RENEWAL_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
      }
    });

    console.log(`RVT renewal monitoring complete. Processed: ${processed}, At Risk: ${atRisk}, Reminders: ${remindersQueued}`);

    return new Response(
      JSON.stringify({
        success: true,
        users_processed: processed,
        at_risk_users: atRisk,
        reminders_queued: remindersQueued
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in RVT renewal monitor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
