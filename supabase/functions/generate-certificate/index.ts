import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1?target=deno';

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

async function buildCertificatePdf(opts: {
  recipientName: string;
  courseTitle: string;
  certificateNumber: string;
  issueDate: Date;
  expiryDate: Date;
  certificationLevel: string;
  verifyUrl: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  // Landscape Letter
  const page = pdf.addPage([792, 612]);
  const { width, height } = page.getSize();

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const helvOblique = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const navy = rgb(0.05, 0.18, 0.32);
  const gold = rgb(0.76, 0.6, 0.16);
  const ink = rgb(0.12, 0.12, 0.14);
  const muted = rgb(0.38, 0.38, 0.42);

  // Border
  page.drawRectangle({ x: 24, y: 24, width: width - 48, height: height - 48, borderColor: navy, borderWidth: 2 });
  page.drawRectangle({ x: 34, y: 34, width: width - 68, height: height - 68, borderColor: gold, borderWidth: 1 });

  const center = (text: string, y: number, size: number, font = helv, color = ink) => {
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - w) / 2, y, size, font, color });
  };

  center('CERTIFICATE OF COMPLETION', height - 90, 22, helvBold, navy);
  center('ProCannEdu — Maryland Cannabis Training', height - 115, 12, helvOblique, muted);

  center('This certifies that', height - 175, 13, helv, muted);
  center(opts.recipientName, height - 215, 30, helvBold, ink);

  // Decorative underline under name
  const nameW = helvBold.widthOfTextAtSize(opts.recipientName, 30);
  page.drawLine({
    start: { x: (width - nameW) / 2 - 20, y: height - 225 },
    end: { x: (width + nameW) / 2 + 20, y: height - 225 },
    thickness: 0.75,
    color: gold,
  });

  center('has successfully completed', height - 255, 13, helv, muted);
  center(opts.courseTitle, height - 285, 18, helvBold, navy);
  center(`Certification Level: ${opts.certificationLevel}`, height - 308, 12, helv, ink);

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Details row
  const rowY = 170;
  page.drawText('Certificate No.', { x: 90, y: rowY + 18, size: 9, font: helv, color: muted });
  page.drawText(opts.certificateNumber, { x: 90, y: rowY, size: 12, font: helvBold, color: ink });

  page.drawText('Issued', { x: 340, y: rowY + 18, size: 9, font: helv, color: muted });
  page.drawText(fmt(opts.issueDate), { x: 340, y: rowY, size: 12, font: helvBold, color: ink });

  page.drawText('Expires', { x: 560, y: rowY + 18, size: 9, font: helv, color: muted });
  page.drawText(fmt(opts.expiryDate), { x: 560, y: rowY, size: 12, font: helvBold, color: ink });

  // Footer
  center(`Verify at: ${opts.verifyUrl}`, 70, 10, helvOblique, muted);
  center('Issued by ProCannEdu • www.procannedu.com', 52, 9, helv, muted);

  return await pdf.save();
}

// Service client must live OUTSIDE the try so the catch block can still log to the DB.
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    // Rate limit (3/hour)
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        _user_id: user.id,
        _action_type: 'certificate_generation',
        _max_requests: 3,
        _window_minutes: 60,
      });

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return new Response(
        JSON.stringify({ error: 'Security check failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!rateLimitCheck) {
      await supabase.rpc('log_security_event', {
        _event_type: 'rate_limit_violation',
        _details: {
          action: 'certificate_generation',
          ip_address: req.headers.get('x-forwarded-for') || 'unknown',
          user_agent: req.headers.get('user-agent') || 'unknown',
        },
      });
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. You can only generate 3 certificates per hour.' }),
        { status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { exam_attempt_id, user_data, exam_results }: GenerateCertificateRequest = await req.json();

    await supabase.rpc('log_security_event', {
      _event_type: 'certificate_generation_attempted',
      _details: {
        exam_attempt_id,
        ip_address: req.headers.get('x-forwarded-for') || 'unknown',
        user_agent: req.headers.get('user-agent') || 'unknown',
      },
    });

    console.log(`Generating certificate for user ${user.id}, exam attempt ${exam_attempt_id}`);

    // Verify exam attempt
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

    // Existing certificate?
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('certificate_number, pdf_url')
      .eq('exam_attempt_id', exam_attempt_id)
      .single();

    if (existingCert) {
      return new Response(
        JSON.stringify({
          certificate_number: existingCert.certificate_number,
          pdf_path: existingCert.pdf_url,
          message: 'Certificate already exists',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: certNumber, error: certError } = await supabase.rpc('generate_certificate_number');
    if (certError || !certNumber) {
      console.error('Error generating certificate number:', certError);
      throw new Error('Failed to generate certificate number');
    }

    // Two-track logic preserved
    const RVT_MODULE_MIN = 0, RVT_MODULE_MAX = 18;
    const MANAGER_MODULE_MIN = 19, MANAGER_MODULE_MAX = 23;
    const RVT_MODULE_COUNT = 19, MANAGER_MODULE_COUNT = 5;

    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('module_id')
      .eq('user_id', user.id)
      .eq('course_id', examAttempt.course_id)
      .eq('is_completed', true);

    let certificationType: 'rvt' | 'manager' = 'rvt';
    let certificationLevel = 'RVT Agent'; // human-readable label (PDF/email only)
    let certificationLevelDb: 'agent' | 'manager' = 'agent'; // DB CHECK constraint value
    let tierBadge = 'rvt';
    let trainingTrack = 'Maryland RVT Required Training';
    let rvtComplete = false;
    let managerComplete = false;

    if (userProgress && userProgress.length > 0) {
      const moduleIds = userProgress.map((p) => p.module_id).filter(Boolean);
      if (moduleIds.length > 0) {
        const { data: completedModules } = await supabase
          .from('course_modules')
          .select('module_number')
          .in('id', moduleIds);

        if (completedModules) {
          const completedNumbers = completedModules.map((m) => m.module_number);
          const rvtModulesCompleted = completedNumbers.filter((n) => n >= RVT_MODULE_MIN && n <= RVT_MODULE_MAX);
          rvtComplete = rvtModulesCompleted.length === RVT_MODULE_COUNT;
          const managerModulesCompleted = completedNumbers.filter((n) => n >= MANAGER_MODULE_MIN && n <= MANAGER_MODULE_MAX);
          managerComplete = managerModulesCompleted.length === MANAGER_MODULE_COUNT;

          if (rvtComplete && managerComplete) {
            certificationType = 'manager';
            certificationLevel = 'Manager';
            certificationLevelDb = 'manager';
            tierBadge = 'manager';
            trainingTrack = 'RVT Required + Manager Leadership Track';
          }
        }
      }
    }

    if (!rvtComplete) {
      console.error('RVT modules not complete - cannot issue certificate');
      return new Response(
        JSON.stringify({ error: 'Complete all RVT Required modules (0-18) before requesting certification.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 2);

    const verifyUrl = `https://www.procannedu.com/verify?code=${certNumber}`;

    // Create certificate row first (so we have an ID and the row survives even if PDF fails)
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
        certification_level: certificationLevelDb,
        tier_badge: tierBadge,
        metadata: {
          exam_score: exam_results.total_score,
          exam_time_taken: exam_results.time_taken,
          user_ip: req.headers.get('x-forwarded-for') || 'unknown',
          photo_verified: !!user_data.photo,
          generation_timestamp: new Date().toISOString(),
          certificate_type: certificationType,
          certification_level_label: certificationLevel,
          training_track: trainingTrack,
          rvt_complete: rvtComplete,
          manager_complete: managerComplete,
          verify_url: verifyUrl,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating certificate:', insertError);
      await supabase
        .from('exam_attempts')
        .update({
          metadata: {
            certificate_generation_failed: true,
            failure_reason: insertError.message,
            failure_timestamp: new Date().toISOString(),
          },
        })
        .eq('id', exam_attempt_id);
      throw new Error('Failed to create certificate');
    }

    console.log('Certificate created successfully:', certificate.certificate_number);

    // Fetch profile + course details
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single();

    const { data: course } = await supabase
      .from('courses')
      .select('title')
      .eq('id', examAttempt.course_id)
      .single();

    const recipientName =
      `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
      user_data?.name ||
      user.email ||
      'Certificate Holder';

    const courseTitle = course?.title || 'Maryland Responsible Vendor Training (RVT)';

    // Audit log
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
        certification_type: certificationType,
      },
    });

    // user_certificates
    const verificationCode = `${certificationType === 'manager' ? 'MGR' : 'RVT'}-${new Date()
      .toISOString()
      .slice(0, 7)
      .replace('-', '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await supabase.from('user_certificates').insert({
      user_id: user.id,
      course_id: examAttempt.course_id,
      certificate_name: certificationType === 'manager' ? 'Manager Leadership Certificate' : 'RVT Agent Certificate',
      verification_code: verificationCode,
      recipient_name: recipientName,
      pdf_url: verifyUrl,
      metadata: {
        certificate_number: certificate.certificate_number,
        exam_score: exam_results.total_score,
      },
    });

    // --- PDF generation + upload (resilient: failure must NOT block cert) ---
    let storedPdfPath: string | null = null;
    try {
      const pdfBytes = await buildCertificatePdf({
        recipientName,
        courseTitle,
        certificateNumber: certificate.certificate_number,
        issueDate,
        expiryDate,
        certificationLevel,
        verifyUrl,
      });

      const objectPath = `${user.id}/${examAttempt.course_id}/${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(objectPath, pdfBytes, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      storedPdfPath = objectPath;
    } catch (pdfErr: any) {
      console.error('PDF generation/upload failed:', pdfErr);
      await supabase.from('certificate_generation_errors').insert({
        source: 'generate-certificate:pdf',
        attempt_number: 1,
        error_message: pdfErr?.message || 'PDF step failed',
        error_detail: {
          stack: pdfErr?.stack || null,
          certificate_number: certificate.certificate_number,
          user_id: user.id,
        },
      });
      // Continue — certificate record stands.
    }

    // Persist final pdf_url (storage path if we have one; else verify URL fallback)
    await supabase
      .from('certificates')
      .update({ pdf_url: storedPdfPath ?? verifyUrl })
      .eq('id', certificate.id);

    // course_completions write-back (passed + certificate_url)
    await supabase.from('course_completions').upsert(
      {
        user_id: user.id,
        course_id: examAttempt.course_id,
        completion_percent: 100,
        passed: true,
        completed_at: new Date().toISOString(),
        certificate_url: storedPdfPath ?? verifyUrl,
      },
      { onConflict: 'user_id,course_id' }
    );

    await supabase.rpc('log_security_event', {
      _event_type: 'certificate_generation_completed',
      _details: {
        certificate_number: certificate.certificate_number,
        exam_attempt_id,
        course_id: examAttempt.course_id,
        verification_code: verificationCode,
        pdf_stored: !!storedPdfPath,
      },
    });

    await supabase
      .from('user_learning_journey')
      .update({
        current_stage: 'certified',
        stage_entered_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        predicted_completion_date: null,
        success_probability: 1.0,
        at_risk_flag: false,
      })
      .eq('user_id', user.id);

    const emailCourseTitle =
      certificationType === 'manager'
        ? 'Maryland RVT + Manager Leadership Training'
        : 'Maryland Responsible Vendor Training';

    supabase.functions
      .invoke('send-certificate-email', {
        body: {
          email: user.email,
          firstName: profile?.first_name || 'Student',
          lastName: profile?.last_name || '',
          certificateNumber: certificate.certificate_number,
          courseTitle: emailCourseTitle,
          issueDate: issueDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          expiryDate: expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
          certificateUrl: verifyUrl,
          certificationType,
          trainingTrack,
        },
      })
      .catch((err) => console.error('Certificate email failed:', err));

    return new Response(
      JSON.stringify({
        certificate_number: certificate.certificate_number,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date,
        pdf_path: storedPdfPath,
        verify_url: verifyUrl,
        message: 'Certificate generated successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (error: any) {
    console.error('Error generating certificate:', error);
    try {
      await supabase.from('certificate_generation_errors').insert({
        source: 'generate-certificate',
        attempt_number: 1,
        error_message: error?.message || 'Unknown error',
        error_detail: { stack: error?.stack || null },
      });
    } catch (logErr) {
      console.error('Failed to log certificate_generation_error:', logErr);
    }
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
