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

  center('PROCANN EDU COMPLETION RECORD', height - 90, 22, helvBold, navy);
  center('ProCannEdu — Maryland Cannabis Training', height - 115, 12, helvOblique, muted);

  center('This records that', height - 175, 13, helv, muted);
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
  center(`Training Track: ${opts.certificationLevel}`, height - 308, 12, helv, ink);

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
      // maybeSingle(): "no certificate yet" is the normal path here, not a 406 error.
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({
          certificate_number: existingCert.certificate_number,
          pdf_path: existingCert.pdf_url,
          message: 'Completion record already exists',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { data: certNumber, error: certError } = await supabase.rpc('generate_certificate_number');
    if (certError || !certNumber) {
      console.error('Error generating certificate number:', certError);
      throw new Error('Failed to generate certificate number');
    }

    // ------------------------------------------------------------------
    // Curriculum truth: derive the required module ID sets from the LIVE
    // course_modules rows for the course this exam attempt belongs to.
    // No hardcoded module-number ranges or counts — set comparison only.
    // Already-issued certificates are never revisited or modified here.
    // ------------------------------------------------------------------
    const { data: activeModules, error: activeModulesError } = await supabase
      .from('course_modules')
      .select('id, is_manager_only')
      .eq('course_id', examAttempt.course_id)
      .eq('is_active', true);

    if (activeModulesError || !activeModules || activeModules.length === 0) {
      console.error('Could not resolve active curriculum for course', examAttempt.course_id, activeModulesError);
      return new Response(
        JSON.stringify({ error: 'Could not resolve the active curriculum for this course. No completion record was issued.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const requiredCoreIds = new Set<string>(
      activeModules.filter((m: any) => m.is_manager_only !== true).map((m: any) => m.id),
    );
    const requiredManagerIds = new Set<string>(
      activeModules.filter((m: any) => m.is_manager_only === true).map((m: any) => m.id),
    );

    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('module_id')
      .eq('user_id', user.id)
      .eq('course_id', examAttempt.course_id)
      .eq('is_completed', true);

    const completedIds = new Set<string>(
      (userProgress ?? []).map((p: any) => p.module_id).filter(Boolean),
    );

    const completedCoreIds = [...requiredCoreIds].filter((id) => completedIds.has(id));
    const completedManagerIds = [...requiredManagerIds].filter((id) => completedIds.has(id));

    // The exam attempt was already verified above as this user's PASSED attempt
    // (is_passed = true) for this course — that is the exam evidence for both tracks.
    const examPassed = examAttempt.is_passed === true;

    const rvtComplete = completedCoreIds.length === requiredCoreIds.size && examPassed;
    const managerComplete =
      rvtComplete &&
      requiredManagerIds.size > 0 &&
      completedManagerIds.length === requiredManagerIds.size;

    let certificationType: 'rvt' | 'manager' = 'rvt';
    let certificationLevel = 'Core Track'; // human-readable label (PDF/email only)
    let certificationLevelDb: 'agent' | 'manager' = 'agent'; // DB CHECK constraint value
    let tierBadge = 'rvt';
    let trainingTrack = 'Maryland Cannabis Compliance Training';

    if (managerComplete) {
      certificationType = 'manager';
      certificationLevel = 'Manager';
      certificationLevelDb = 'manager';
      tierBadge = 'manager';
      trainingTrack = 'Core Track + Manager Leadership Track';
    }

    if (!rvtComplete) {
      console.error(
        `Core curriculum incomplete — ${completedCoreIds.length}/${requiredCoreIds.size} required core modules, exam_passed=${examPassed}`,
      );
      return new Response(
        JSON.stringify({
          error: `Complete all ${requiredCoreIds.size} active core training modules and pass the exam before requesting a completion record.`,
          required_core_modules: requiredCoreIds.size,
          completed_core_modules: completedCoreIds.length,
          exam_passed: examPassed,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const issuanceSnapshot = {
      required_core_count: requiredCoreIds.size,
      required_manager_count: requiredManagerIds.size,
      completed_required_count: completedCoreIds.length + completedManagerIds.length,
      required_core_module_ids: [...requiredCoreIds],
      required_manager_module_ids: [...requiredManagerIds],
      completed_core_module_ids: completedCoreIds,
      completed_manager_module_ids: completedManagerIds,
      issued_curriculum_at: new Date().toISOString(),
      exam_attempt_id,
      exam_total_score: examAttempt.total_score ?? null,
      exam_is_passed: examPassed,
    };


    const issueDate = new Date();
    const expiryDate = new Date(issueDate);
    // COMAR 14.17.15.05(C) (Louis Hendricks III, Director of Compliance, Aug 16 2026;
    // William F. Cunningham Jr. go 2026-08-23):
    // "C. Within 90 days of employment start date and annually thereafter, a registered
    // agent employed by a cannabis licensee shall complete a responsible vendor training
    // program that:" Training remains annual and is still named Responsible Vendor Training
    // (RVT). If an agent starts after July 1, 2026 they must complete their annual training
    // within 90 days of employment, then every year afterwards. Do not implement a two-year
    // cycle. The 2-year clock in COMAR 14.17.15.03(C) governs the agent ID CARD, not training.
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

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
          issuance_snapshot: issuanceSnapshot,

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

    const courseTitle = course?.title || 'Maryland Cannabis Compliance Training';

    // Audit log is written by the certificates DB trigger (metadata.source = "db_trigger").
    // The insert that used to live here was redundant and always failed.



    // user_certificates
    const verificationCode = `${certificationType === 'manager' ? 'MGR' : 'RVT'}-${new Date()
      .toISOString()
      .slice(0, 7)
      .replace('-', '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    await supabase.from('user_certificates').insert({
      user_id: user.id,
      course_id: examAttempt.course_id,
      certificate_name: certificationType === 'manager' ? 'ProCann EDU Manager Leadership Completion Record' : 'ProCann EDU Core Track Completion Record',
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

    // Server-side (service role) is the ONLY writer of user_learning_journey.
    const { error: journeyError } = await supabase
      .from('user_learning_journey')
      .update({
        // Must be one of the values allowed by user_learning_journey_current_stage_check.
        current_stage: 'certificate_issued',
        stage_entered_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
        predicted_completion_date: null,
        success_probability: 1.0,
        at_risk_flag: false,
      })
      .eq('user_id', user.id);

    if (journeyError) {
      console.error('[generate-certificate] user_learning_journey update failed:', journeyError);
    }


    return new Response(
      JSON.stringify({
        certificate_number: certificate.certificate_number,
        issue_date: certificate.issue_date,
        expiry_date: certificate.expiry_date,
        pdf_path: storedPdfPath,
        verify_url: verifyUrl,
        message: 'Completion record generated successfully',
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
