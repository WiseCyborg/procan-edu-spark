import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateCertificateRequest {
  exam_attempt_id: string;
  user_data: {
    name: string;
    email: string;
    phone: string;
    ip: string;
    photo?: string;
  };
  exam_results: {
    total_score: number;
    total_questions: number;
    time_taken: number;
    passing_score: number;
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get authenticated user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check rate limit for certificate generation (3 per hour)
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        _user_id: user.id,
        _action_type: 'certificate_generation',
        _max_requests: 3,
        _window_minutes: 60
      });

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Security check failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!rateLimitCheck) {
      // Log rate limit violation
      await supabase.rpc('log_security_event', {
        _event_type: 'rate_limit_violation',
        _details: {
          action: 'certificate_generation',
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown'
        }
      });

      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. You can only generate 3 certificates per hour.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { exam_attempt_id, user_data, exam_results }: GenerateCertificateRequest = await req.json();

    // Log certificate generation attempt
    await supabase.rpc('log_security_event', {
      _event_type: 'certificate_generation_attempted',
      _details: {
        exam_attempt_id,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown'
      }
    });

    console.log(`Generating certificate for user ${user.id}, exam attempt ${exam_attempt_id}`);

    // Verify exam attempt belongs to user and passed
    const { data: examAttempt, error: examError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', exam_attempt_id)
      .eq('user_id', user.id)
      .eq('is_passed', true)
      .single();

    if (examError || !examAttempt) {
      console.error('Invalid exam attempt:', examError);
      return new Response(
        JSON.stringify({ error: 'Invalid exam attempt or exam not passed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('certificate_number')
      .eq('exam_attempt_id', exam_attempt_id)
      .single();

    if (existingCert) {
      return new Response(
        JSON.stringify({ 
          certificate_number: existingCert.certificate_number,
          message: 'Certificate already exists'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Generate certificate number
    const { data: certNumber, error: certError } = await supabase
      .rpc('generate_certificate_number');

    if (certError || !certNumber) {
      console.error('Error generating certificate number:', certError);
      throw new Error('Failed to generate certificate number');
    }

    // ==========================================
    // TWO-TRACK CERTIFICATE SYSTEM
    // ==========================================
    // RVT Certificate: Modules 0-18 (required for all)
    // Manager Certificate: Modules 19-23 (optional leadership track)
    // Manager completion NEVER blocks RVT certification
    // ==========================================
    
    const RVT_MODULE_MIN = 0;
    const RVT_MODULE_MAX = 18;
    const MANAGER_MODULE_MIN = 19;
    const MANAGER_MODULE_MAX = 23;
    const RVT_MODULE_COUNT = 19; // 0-18 inclusive
    const MANAGER_MODULE_COUNT = 5; // 19-23 inclusive

    // Check user's completed modules
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('module_id')
      .eq('user_id', user.id)
      .eq('course_id', examAttempt.course_id)
      .eq('is_completed', true);

    // Determine certificate type based on completed modules
    let certificationType: 'rvt' | 'manager' = 'rvt';
    let certificationLevel = 'RVT Agent';
    let tierBadge = 'rvt';
    let trainingTrack = 'Maryland RVT Required Training';
    let rvtComplete = false;
    let managerComplete = false;

    if (userProgress && userProgress.length > 0) {
      const moduleIds = userProgress.map(p => p.module_id).filter(Boolean);
      
      if (moduleIds.length > 0) {
        const { data: completedModules } = await supabase
          .from('course_modules')
          .select('module_number')
          .in('id', moduleIds);

        if (completedModules) {
          const completedNumbers = completedModules.map(m => m.module_number);
          
          // Check RVT completion (modules 0-18)
          const rvtModulesCompleted = completedNumbers.filter(
            n => n >= RVT_MODULE_MIN && n <= RVT_MODULE_MAX
          );
          rvtComplete = rvtModulesCompleted.length === RVT_MODULE_COUNT;
          
          // Check Manager Track completion (modules 19-23)
          const managerModulesCompleted = completedNumbers.filter(
            n => n >= MANAGER_MODULE_MIN && n <= MANAGER_MODULE_MAX
          );
          managerComplete = managerModulesCompleted.length === MANAGER_MODULE_COUNT;
          
          // Determine certificate type
          // Only issue Manager certificate if both RVT AND Manager tracks are complete
          if (rvtComplete && managerComplete) {
            certificationType = 'manager';
            certificationLevel = 'Manager';
            tierBadge = 'manager';
            trainingTrack = 'RVT Required + Manager Leadership Track';
          } else if (rvtComplete) {
            certificationType = 'rvt';
            certificationLevel = 'RVT Agent';
            tierBadge = 'rvt';
            trainingTrack = 'Maryland RVT Required Training';
          }
        }
      }
    }

    // Verify RVT completion is required for any certificate
    if (!rvtComplete) {
      console.error('RVT modules not complete - cannot issue certificate');
      return new Response(
        JSON.stringify({ error: 'Complete all RVT Required modules (0-18) before requesting certification.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Calculate expiry date (2 years from issue)
    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    // Create certificate record
    const { data: certificate, error: insertError } = await supabase
      .from('certificates')
      .insert({
        user_id: user.id,
        course_id: examAttempt.course_id,
        exam_attempt_id: exam_attempt_id,
        certificate_number: certNumber,
        issue_date: issueDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        is_revoked: false,
        certification_level: certificationLevel,
        tier_badge: tierBadge,
        metadata: {
          exam_score: exam_results.total_score,
          exam_time_taken: exam_results.time_taken,
          user_ip: req.headers.get('x-forwarded-for') || 'unknown',
          photo_verified: !!user_data.photo,
          generation_timestamp: new Date().toISOString(),
          certificate_type: certificationType,
          training_track: trainingTrack,
          rvt_complete: rvtComplete,
          manager_complete: managerComplete
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating certificate:', insertError);
      
      // Store failure reason in exam_attempts for retry
      await supabase
        .from('exam_attempts')
        .update({
          metadata: {
            certificate_generation_failed: true,
            failure_reason: insertError.message,
            failure_timestamp: new Date().toISOString()
          }
        })
        .eq('id', exam_attempt_id);
      
      throw new Error('Failed to create certificate');
    }

    console.log('Certificate created successfully:', certificate.certificate_number);

    // Write certificate_audit_log
    await supabase.from('certificate_audit_log').insert({
      certificate_id: certificate.id,
      action: 'ISSUED',
      actor_id: user.id,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      user_agent: req.headers.get('user-agent') || 'unknown',
      metadata: {
        certificate_number: certificate.certificate_number,
        course_id: examAttempt.course_id,
        exam_attempt_id,
        certification_type: certificationType
      }
    });

    // Write user_certificates with verification code
    const verificationCode = `${certificationType === 'manager' ? 'MGR' : 'RVT'}-${new Date().toISOString().slice(0,7).replace('-','')}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;

    await supabase.from('user_certificates').insert({
      user_id: user.id,
      course_id: examAttempt.course_id,
      certificate_name: certificationType === 'manager' ? 'Manager Leadership Certificate' : 'RVT Agent Certificate',
      verification_code: verificationCode,
      recipient_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || user.email,
      pdf_url: `https://procannedu.lovable.app/verify/${certificate.certificate_number}`,
      metadata: {
        certificate_number: certificate.certificate_number,
        exam_score: exam_results.total_score
      }
    });

    // Upsert course_completions as passed
    await supabase.from('course_completions').upsert({
      user_id: user.id,
      course_id: examAttempt.course_id,
      completion_percent: 100,
      passed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,course_id' });

    // Update certificate with pdf_url placeholder
    await supabase.from('certificates')
      .update({ pdf_url: `https://procannedu.lovable.app/verify/${certificate.certificate_number}` })
      .eq('id', certificate.id);

    // Log successful certificate generation
    await supabase.rpc('log_security_event', {
      _event_type: 'certificate_generation_completed',
      _details: {
        certificate_number: certificate.certificate_number,
        exam_attempt_id,
        course_id: examAttempt.course_id,
        verification_code: verificationCode
      }
    });

    // Update learning journey to certified stage
    await supabase
      .from('user_learning_journey')
      .update({
        current_stage: 'certified',
        stage_entered_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        predicted_completion_date: null,
        success_probability: 1.0,
        at_risk_flag: false
      })
      .eq('user_id', user.id);

    // Fetch user and course details for certificate email
    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("user_id", user.id)
      .single();

    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", examAttempt.course_id)
      .single();

    // Determine email content based on certificate type
    const emailCourseTitle = certificationType === 'manager' 
      ? 'Maryland RVT + Manager Leadership Training'
      : 'Maryland Responsible Vendor Training';
    
    const certificateUrl = `https://www.procannedu.com/verify/${certificate.certificate_number}`;

    // Trigger certificate email (fire-and-forget)
    supabase.functions.invoke('send-certificate-email', {
      body: {
        email: user.email,
        firstName: profile?.first_name || 'Student',
        lastName: profile?.last_name || '',
        certificateNumber: certificate.certificate_number,
        courseTitle: emailCourseTitle,
        issueDate: new Date(certificate.issue_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        expiryDate: new Date(certificate.expiry_date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        certificateUrl: certificateUrl,
        certificationType: certificationType,
        trainingTrack: trainingTrack
      }
    }).catch(err => console.error('Certificate email failed:', err));

    // Return certificate details
    return new Response(
      JSON.stringify({
        certificate_number: certificate.certificate_number,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date,
        message: 'Certificate generated successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error generating certificate:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});