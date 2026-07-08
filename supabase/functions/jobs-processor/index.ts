import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadEmailTemplate } from "../_shared/email-templates.ts";
import { EmailService } from "../_shared/email-service.ts";



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
      const { 
        application_id, 
        contact_email, 
        organization_name, 
        access_key,
        registration_url,
        credits,
        join_code,
        contact_person
      } = job.payload;
      
      const { error } = await supabase.functions.invoke('send-approval-email', {
        body: { 
          application_id, 
          contact_email, 
          contact_person,
          organization_name, 
          access_key,
          registration_url,
          credits,
          join_code
        }
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
  },

  'seat_utilization_alert': async (job, supabase) => {
    // Log an org-level seat-utilization alert into compliance_alerts.
    // The ai-seat-utilization-agent emits these when an org's used/total ratio
    // is < 50% with > 5 seats idle. We surface as an info-level compliance alert
    // rather than an email blast — owners see it in the admin dashboard.
    const p = job.payload || {};
    const { error } = await supabase.from('compliance_alerts').insert({
      alert_type: 'seat_utilization',
      title: `Low seat utilization: ${p.organization_name ?? 'org'}`,
      description: `Org is using ${p.used_seats ?? 0}/${p.total_seats ?? 0} seats (${p.utilization_rate ?? 0}%). ${p.available_seats ?? 0} seats idle.`,
      severity: 'info',
      metadata: p,
    });
    if (error) {
      console.error('[SEAT-UTILIZATION-ALERT] Failed to insert compliance alert:', error);
      throw error;
    }
  },

  'trigger_certificate_email': async (job, supabase) => {
    // Unblocks dead-lettered certificate emails and prevents future cert
    // completions from silently dropping their email notification.
    const certificateId = job.payload?.certificateId || job.payload?.certificate_id;
    if (!certificateId) {
      throw new Error('trigger_certificate_email: missing payload.certificateId');
    }

    // 1) Load the certificate row
    const { data: cert, error: certErr } = await supabase
      .from('certificates')
      .select('id, user_id, certificate_number, pdf_url, course_id, issue_date, expiry_date, certification_level, metadata')
      .eq('id', certificateId)
      .maybeSingle();

    if (certErr) throw certErr;
    if (!cert) throw new Error(`trigger_certificate_email: certificate ${certificateId} not found`);

    // 2) Load recipient profile (profiles is keyed by user_id) and auth user
    const [{ data: profile }, { data: authUser, error: authErr }, { data: course }] = await Promise.all([
      supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', cert.user_id)
        .maybeSingle(),
      supabase.auth.admin.getUserById(cert.user_id),
      supabase.from('courses').select('title').eq('id', cert.course_id).maybeSingle(),
    ]);

    if (authErr) console.warn('[trigger_certificate_email] auth.admin.getUserById error:', authErr);

    const email = authUser?.user?.email || profile?.email;
    if (!email) {
      throw new Error(`trigger_certificate_email: no email found for user ${cert.user_id}`);
    }

    const firstName = profile?.first_name || (authUser?.user?.user_metadata as any)?.first_name || 'Student';
    const lastName = profile?.last_name || (authUser?.user?.user_metadata as any)?.last_name || '';
    const certificationType: 'rvt' | 'manager' =
      cert.certification_level === 'manager' ? 'manager' : 'rvt';
    const courseTitle =
      course?.title ||
      (certificationType === 'manager'
        ? 'Maryland RVT + Manager Leadership Training'
        : 'Maryland Responsible Vendor Training');
    const fmt = (iso: string | null | undefined) =>
      iso ? new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

    // 3) Invoke send-certificate-email with the payload shape it expects
    const { error: invokeErr } = await supabase.functions.invoke('send-certificate-email', {
      body: {
        email,
        firstName,
        lastName,
        certificateNumber: cert.certificate_number,
        courseTitle,
        issueDate: fmt(cert.issue_date) || new Date().toLocaleDateString('en-US'),
        expiryDate: fmt(cert.expiry_date),
        certificateUrl:
          (cert.metadata as any)?.verify_url ||
          `https://www.procannedu.com/verify?code=${cert.certificate_number}`,
        certificationType,
      },
    });

    if (invokeErr) {
      console.error(`[trigger_certificate_email] send-certificate-email failed for ${cert.id}:`, invokeErr);
      throw invokeErr;
    }

    console.log(`[trigger_certificate_email] ✅ sent cert ${cert.certificate_number} to ${email}`);
  },

  'send_progress_milestone': async (job, supabase) => {
    // Circuit breaker guard (mirrors send_welcome_email)
    const { data: circuit } = await supabase.rpc('check_email_circuit');
    if (circuit && circuit[0]?.is_open) {
      console.log('[JOB] Email circuit is OPEN - queueing send_progress_milestone for later retry');
      throw new Error('Email circuit breaker is open');
    }

    try {
      const { user_id, total_modules, modules_completed, milestone_percentage } = job.payload || {};
      if (!user_id || milestone_percentage == null || modules_completed == null || total_modules == null) {
        throw new Error('send_progress_milestone: missing required payload fields');
      }

      // Resolve recipient (same pattern as trigger_certificate_email)
      const [{ data: profile }, { data: authUser, error: authErr }] = await Promise.all([
        supabase
          .from('profiles')
          .select('first_name, last_name, email')
          .eq('user_id', user_id)
          .maybeSingle(),
        supabase.auth.admin.getUserById(user_id),
      ]);

      if (authErr) console.warn('[send_progress_milestone] auth.admin.getUserById error:', authErr);

      const email = authUser?.user?.email || profile?.email;
      if (!email) {
        throw new Error(`send_progress_milestone: no email found for user ${user_id}`);
      }

      const firstName = profile?.first_name || (authUser?.user?.user_metadata as any)?.first_name || 'Student';
      const lastName = profile?.last_name || (authUser?.user?.user_metadata as any)?.last_name || '';

      const html = await loadEmailTemplate('employee-progress-milestone', {
        FirstName: firstName,
        LastName: lastName,
        ProgressPercent: milestone_percentage,
        ModulesCompleted: modules_completed,
        TotalModules: total_modules,
        ContinueUrl: 'https://www.procannedu.com/course',
        NextModule: 'Continue your Maryland RVT certification training',
        NextModuleDuration: '10–15',
        RecentModule: `${modules_completed} of ${total_modules} modules`,
        QuizScore: '',
        TimeSpent: 'Progress saved',
      });

      const emailService = new EmailService();
      const result = await emailService.send({
        to: email,
        subject: `🎯 ${milestone_percentage}% Complete - Keep Going!`,
        html,
        email_type: 'progress_milestone',
        metadata: { user_id, milestone_percentage, modules_completed, total_modules },
      });

      await supabase.from('email_logs').insert({
        recipient_email: email,
        subject: `🎯 ${milestone_percentage}% Complete - Keep Going!`,
        email_type: 'progress_milestone',
        status: result.success ? 'sent' : 'failed',
        metadata: { user_id, milestone_percentage, modules_completed, total_modules },
      });

      await supabase.rpc('record_email_result', { p_success: true });
      console.log(`[send_progress_milestone] ✅ sent ${milestone_percentage}% milestone to ${email}`);
    } catch (error) {
      await supabase.rpc('record_email_result', { p_success: false });
      throw error;
    }
  },
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
    let jobs: Job[] = [];

    // Try RPC first (optimal server-side filtering)
    const { data: rpcJobs, error: rpcError } = await supabase
      .rpc('get_jobs_to_process', { batch_size: batchSize });

    if (rpcError) {
      // Fallback: Direct SQL query if PostgREST schema cache hasn't picked up RPC
      console.log('[JOBS-PROCESSOR] RPC failed, using fallback query:', rpcError.code);
      
      const { data: fallbackJobs, error: fallbackError } = await supabase
        .from('system_jobs')
        .select('*')
        .or('status.eq.queued,status.eq.failed')
        .order('queued_at', { ascending: true })
        .limit(batchSize * 2); // Fetch more since we'll filter client-side

      if (fallbackError) {
        throw fallbackError;
      }

      // Client-side filtering for retry logic
      jobs = (fallbackJobs || []).filter((job: Job) => 
        job.status === 'queued' || 
        (job.status === 'failed' && 
         (!job.metadata?.next_retry_at || new Date(job.metadata.next_retry_at) < new Date()) && 
         job.retry_count < job.max_retries)
      ).slice(0, batchSize);
    } else {
      jobs = rpcJobs || [];
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
