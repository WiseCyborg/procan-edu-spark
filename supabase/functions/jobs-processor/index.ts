import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  job_type: string;
  payload: any;
  retry_count: number;
  max_retries: number;
  metadata: any;
}

// Job handlers registry
const JOB_HANDLERS: Record<string, (job: Job, supabase: any) => Promise<void>> = {
  'send_approval_email': async (job, supabase) => {
    // Check circuit breaker
    const { data: circuit } = await supabase.rpc('check_email_circuit');
    
    if (circuit && circuit[0]?.is_open) {
      console.log('[JOB] Email circuit is OPEN - queueing for later retry');
      throw new Error('Email circuit breaker is open');
    }
    
    try {
      const { application_id, contact_email, organization_name, access_key } = job.payload;
      
      const { error } = await supabase.functions.invoke('send-approval-email', {
        body: { application_id, contact_email, organization_name, access_key }
      });
      
      if (error) throw error;
      
      // Record success
      await supabase.rpc('record_email_result', { p_success: true });
    } catch (error) {
      // Record failure
      await supabase.rpc('record_email_result', { p_success: false });
      throw error;
    }
  },
  
  'send_employee_invitation': async (job, supabase) => {
    const { data: circuit } = await supabase.rpc('check_email_circuit');
    
    if (circuit && circuit[0]?.is_open) {
      throw new Error('Email circuit breaker is open');
    }
    
    try {
      const { invitationId } = job.payload;
      
      const { error } = await supabase.functions.invoke('send-employee-invitation', {
        body: { invitationId }
      });
      
      if (error) throw error;
      
      await supabase.rpc('record_email_result', { p_success: true });
    } catch (error) {
      await supabase.rpc('record_email_result', { p_success: false });
      throw error;
    }
  },
  
  'send_welcome_email': async (job, supabase) => {
    const { data: circuit } = await supabase.rpc('check_email_circuit');
    
    if (circuit && circuit[0]?.is_open) {
      throw new Error('Email circuit breaker is open');
    }
    
    try {
      const { email, firstName, lastName } = job.payload;
      
      const { error } = await supabase.functions.invoke('send-welcome-email', {
        body: { email, firstName, lastName }
      });
      
      if (error) throw error;
      
      await supabase.rpc('record_email_result', { p_success: true });
    } catch (error) {
      await supabase.rpc('record_email_result', { p_success: false });
      throw error;
    }
  },
  
  'generate_certificate': async (job, supabase) => {
    const { exam_attempt_id, user_id } = job.payload;
    
    const { error } = await supabase.functions.invoke('generate-certificate', {
      body: { exam_attempt_id, user_id }
    });
    
    if (error) throw error;
  },
  
  'admin_alert': async (job, supabase) => {
    // Send to admin notification channel
    console.error('[ADMIN ALERT]', job.payload);
    
    const { error } = await supabase.from('compliance_alerts').insert({
      alert_type: job.payload.alert_type,
      title: `Job Alert: ${job.payload.job_type || 'System'}`,
      description: job.payload.error || job.payload.message || 'Job requires attention',
      severity: 'error',
      metadata: job.payload
    });
    
    if (error) {
      console.error('[ADMIN ALERT] Failed to insert alert:', error);
    }
  }
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

    const batchSize = 10;
    const now = new Date().toISOString();

    // Fetch jobs to process (queued + failed with retry time passed)
    const { data: jobs, error: fetchError } = await supabase
      .from('system_jobs')
      .select('*')
      .or(`status.eq.queued,and(status.eq.failed,next_retry_at.lt.${now},retry_count.lt.max_retries)`)
      .order('queued_at', { ascending: true })
      .limit(batchSize);

    if (fetchError) {
      throw fetchError;
    }

    if (!jobs || jobs.length === 0) {
      console.log('[JOBS-PROCESSOR] No jobs to process');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[JOBS-PROCESSOR] Processing ${jobs.length} jobs`);

    const results = await Promise.allSettled(
      jobs.map(async (job: Job) => {
        const startTime = Date.now();
        
        try {
          // Mark as processing
          await supabase
            .from('system_jobs')
            .update({ status: 'processing', started_at: new Date().toISOString() })
            .eq('id', job.id);

          // Execute job handler
          const handler = JOB_HANDLERS[job.job_type];
          if (!handler) {
            throw new Error(`No handler for job type: ${job.job_type}`);
          }

          await handler(job, supabase);

          // Mark as completed
          await supabase
            .from('system_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              metadata: { ...job.metadata, execution_time_ms: Date.now() - startTime }
            })
            .eq('id', job.id);

          console.log(`[JOBS-PROCESSOR] ✅ Completed job ${job.id} (${job.job_type})`);
          
        } catch (error: any) {
          console.error(`[JOBS-PROCESSOR] ❌ Failed job ${job.id} (${job.job_type}):`, error);

          const nextRetryCount = job.retry_count + 1;
          const shouldRetry = nextRetryCount < job.max_retries;

          if (shouldRetry) {
            // Calculate exponential backoff: 2^retry_count minutes
            const backoffMinutes = Math.pow(2, nextRetryCount);
            const nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000);

            await supabase
              .from('system_jobs')
              .update({
                status: 'failed',
                retry_count: nextRetryCount,
                last_error: error.message,
                next_retry_at: nextRetryAt.toISOString(),
                metadata: { 
                  ...job.metadata, 
                  last_attempt_at: new Date().toISOString(),
                  execution_time_ms: Date.now() - startTime
                }
              })
              .eq('id', job.id);

            console.log(`[JOBS-PROCESSOR] 🔄 Scheduled retry ${nextRetryCount}/${job.max_retries} for job ${job.id} at ${nextRetryAt}`);
          } else {
            // Move to dead letter queue
            await supabase.rpc('move_to_deadletter', { p_job_id: job.id });
            console.log(`[JOBS-PROCESSOR] ⚰️ Moved job ${job.id} to dead letter queue`);
          }
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({ 
        processed: jobs.length,
        successful,
        failed
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('[JOBS-PROCESSOR] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
