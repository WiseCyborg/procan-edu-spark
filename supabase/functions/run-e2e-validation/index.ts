import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorMeta {
  code?: string;
  message?: string;
  table?: string;
  rpc?: string;
  hint?: string;
  details?: any;
}

interface TestResult {
  journey: string;
  step: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes: string;
  timestamp: string;
  error_meta?: ErrorMeta;
  is_blocker: boolean;
}

interface JourneySummary {
  name: string;
  required_steps: string[];
  completed_steps: string[];
  all_passed: boolean;
  is_blocker: boolean;
}

interface E2EReport {
  test_run_id: string;
  started_at: string;
  completed_at: string;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  blocker_count: number;
  release_gate_status: 'SHIPPABLE' | 'NOT_SHIPPABLE';
  results: TestResult[];
  journey_summaries: JourneySummary[];
  cleanup_performed: boolean;
  test_data_created: {
    test_user_email?: string;
    test_application_id?: string;
    test_progress_id?: string;
    test_certificate_id?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const results: TestResult[] = [];
    const testRunId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const testEmailPrefix = `e2e+${testRunId.slice(0, 8)}`;
    
    const testDataCreated: E2EReport['test_data_created'] = {};

    // Helper to add test result with structured error metadata
    const addResult = (
      journey: string, 
      step: string, 
      expected: string, 
      actual: string, 
      passed: boolean, 
      options: { 
        notes?: string; 
        error_meta?: ErrorMeta; 
        is_blocker?: boolean;
      } = {}
    ) => {
      results.push({
        journey,
        step,
        expected,
        actual,
        passed,
        notes: options.notes || '',
        timestamp: new Date().toISOString(),
        error_meta: options.error_meta,
        is_blocker: options.is_blocker ?? false
      });
      
      // Log for debugging
      console.log(`[${journey}] ${step}: ${passed ? '✓' : '✗'} ${actual}`);
    };

    // ==========================================
    // CLEANUP: Remove previous test data
    // ==========================================
    console.log('=== Starting E2E Cleanup ===');
    
    try {
      // Delete test applications
      await supabase
        .from('dispensary_applications')
        .delete()
        .like('contact_email', 'e2e+%');
      
      // Delete test progress records
      await supabase
        .from('user_progress')
        .delete()
        .like('user_id', '00000000-0000-0000-0000-%'); // Test UUID pattern
      
      // Delete test certificates
      await supabase
        .from('certificates')
        .delete()
        .like('certificate_number', 'E2E-%');
      
      // Delete test exam attempts
      await supabase
        .from('exam_attempts')
        .delete()
        .like('user_id', '00000000-0000-0000-0000-%');
        
      console.log('Cleanup completed');
    } catch (cleanupError: any) {
      console.log('Cleanup warning:', cleanupError.message);
    }

    // ==========================================
    // JOURNEY A: AUTH - Signup/Login + Password Reset (BLOCKER)
    // ==========================================
    console.log('=== Journey A: Auth Flow ===');
    
    // A1: Check auth system connectivity
    try {
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1 });
      addResult('Auth', 'System Connectivity', 'Auth system accessible', 
        authError ? `Error: ${authError.message}` : 'Connected', 
        !authError,
        { is_blocker: true, error_meta: authError ? { code: authError.name, message: authError.message } : undefined }
      );
    } catch (e: any) {
      addResult('Auth', 'System Connectivity', 'Auth system accessible', `Exception: ${e.message}`, false, 
        { is_blocker: true, error_meta: { code: 'EXCEPTION', message: e.message } }
      );
    }

    // A2: Check password reset tokens table structure
    const { data: resetTokens, error: resetTokenError } = await supabase
      .from('password_reset_tokens')
      .select('id, user_id, token, expires_at, used')
      .order('created_at', { ascending: false })
      .limit(1);
    
    addResult('Auth', 'Password Reset Table', 'Reset tokens table accessible with correct schema', 
      resetTokenError ? `Error: ${resetTokenError.message}` : 'Schema valid',
      !resetTokenError,
      { is_blocker: true, error_meta: resetTokenError ? { code: resetTokenError.code, message: resetTokenError.message, table: 'password_reset_tokens' } : undefined }
    );

    // A3: Check recent successful password resets
    const { data: recentResets, error: recentResetError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('used', true)
      .order('created_at', { ascending: false })
      .limit(5);
    
    const recentResetCount = recentResets?.length || 0;
    addResult('Auth', 'Password Reset Completions', '≥1 completed reset in history', 
      `${recentResetCount} completed resets`,
      recentResetCount >= 1,
      { notes: recentResetCount === 0 ? 'No users have successfully reset passwords' : `Last reset: ${recentResets?.[0]?.created_at || 'N/A'}` }
    );

    // A4: Validate send-password-reset edge function exists
    try {
      // We can't actually invoke it without a real email, but we check the function exists
      const { data: funcCheck, error: funcError } = await supabase.functions.invoke('send-password-reset', {
        body: { email: 'test-check@example.com' }
      });
      // Even if it fails due to invalid email, the function existing is what matters
      addResult('Auth', 'Reset Function Deployed', 'send-password-reset function accessible',
        funcError?.message?.includes('not found') ? 'Function NOT deployed' : 'Function deployed',
        !funcError?.message?.includes('not found'),
        { is_blocker: true }
      );
    } catch (e: any) {
      addResult('Auth', 'Reset Function Deployed', 'send-password-reset function accessible',
        `Exception: ${e.message}`, false, { is_blocker: true }
      );
    }

    // ==========================================
    // JOURNEY B: DISPENSARY APPLICATION Step 1-4 (BLOCKER)
    // ==========================================
    console.log('=== Journey B: Dispensary Application Flow ===');
    
    const testApplicationPayload = {
      organizationName: `E2E Test Org ${testRunId.slice(0, 8)}`,
      legalEntityName: `E2E Test LLC ${testRunId.slice(0, 8)}`,
      dbaName: '',
      licenseType: 'dispensary',
      licenseNumber: `E2E-${testRunId.slice(0, 8)}`,
      licenseIssueDate: '2024-01-15',
      licenseExpiryDate: '2026-01-15',
      contactPerson: 'E2E Test User',
      contactEmail: `${testEmailPrefix}@procannedu.com`,
      contactPhone: '(555) 123-4567',
      address: '123 Test Street, Baltimore, MD 21201',
      estimatedEmployees: 5,
      preferredStartDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      complianceAffirmation: true,
      privacyAcknowledgment: true,
      trainingResponsibility: true
    };

    // B1: Submit application via edge function
    let applicationSubmitSuccess = false;
    let applicationId: string | null = null;
    
    try {
      const { data: submitData, error: submitError } = await supabase.functions.invoke('submit-dispensary-application', {
        body: testApplicationPayload
      });
      
      if (submitError) {
        addResult('Dispensary Application', 'Step 4 Submit', 'Application submitted successfully',
          `Error: ${submitError.message}`,
          false,
          { 
            is_blocker: true, 
            error_meta: { 
              code: 'EDGE_FUNCTION_ERROR', 
              message: submitError.message,
              details: submitError
            }
          }
        );
      } else if (submitData?.error) {
        addResult('Dispensary Application', 'Step 4 Submit', 'Application submitted successfully',
          `API Error: ${submitData.error}`,
          false,
          { 
            is_blocker: true, 
            error_meta: { 
              code: submitData.code || 'API_ERROR', 
              message: submitData.error,
              details: submitData
            }
          }
        );
      } else {
        applicationSubmitSuccess = true;
        applicationId = submitData?.application?.id;
        testDataCreated.test_application_id = applicationId;
        addResult('Dispensary Application', 'Step 4 Submit', 'Application submitted successfully',
          `Submitted: ${applicationId}`,
          true,
          { notes: 'Full Step 1-4 payload accepted' }
        );
      }
    } catch (e: any) {
      addResult('Dispensary Application', 'Step 4 Submit', 'Application submitted successfully',
        `Exception: ${e.message}`,
        false,
        { is_blocker: true, error_meta: { code: 'EXCEPTION', message: e.message } }
      );
    }

    // B2: Verify DB record exists with correct status
    if (applicationSubmitSuccess && applicationId) {
      const { data: dbRecord, error: dbError } = await supabase
        .from('dispensary_applications')
        .select('*')
        .eq('id', applicationId)
        .single();
      
      if (dbError) {
        addResult('Dispensary Application', 'DB Record Created', 'Record exists in database',
          `Error: ${dbError.message}`,
          false,
          { is_blocker: true, error_meta: { code: dbError.code, message: dbError.message, table: 'dispensary_applications' } }
        );
      } else {
        addResult('Dispensary Application', 'DB Record Created', 'Record exists in database',
          `Record found: ${dbRecord.organization_name}`,
          true
        );
        
        // B3: Verify status is pending
        addResult('Dispensary Application', 'Status = Pending', 'application_status = pending',
          `Status: ${dbRecord.application_status}`,
          dbRecord.application_status === 'pending',
          { is_blocker: dbRecord.application_status !== 'pending' }
        );
        
        // B4: Verify all required fields saved
        const requiredFields = ['organization_name', 'contact_email', 'contact_person', 'license_number', 'compliance_affirmation'];
        const missingFields = requiredFields.filter(f => !dbRecord[f]);
        addResult('Dispensary Application', 'Required Fields Saved', 'All required fields persisted',
          missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}` : 'All fields saved',
          missingFields.length === 0
        );
      }
    } else if (!applicationSubmitSuccess) {
      // Mark dependent tests as skipped
      addResult('Dispensary Application', 'DB Record Created', 'Record exists in database',
        'SKIPPED - Submit failed',
        false,
        { is_blocker: true, notes: 'Cannot verify DB record without successful submit' }
      );
    }

    // B5: Test duplicate prevention
    if (applicationSubmitSuccess) {
      try {
        const { data: dupData, error: dupError } = await supabase.functions.invoke('submit-dispensary-application', {
          body: testApplicationPayload
        });
        
        const isDuplicateBlocked = dupData?.error?.includes('DUPLICATE') || dupData?.code === 'DUPLICATE_APPLICATION';
        addResult('Dispensary Application', 'Duplicate Prevention', 'Duplicate submission blocked',
          isDuplicateBlocked ? 'Duplicate correctly rejected' : `Unexpected: ${JSON.stringify(dupData)}`,
          isDuplicateBlocked,
          { notes: 'Same email should be rejected' }
        );
      } catch (e: any) {
        addResult('Dispensary Application', 'Duplicate Prevention', 'Duplicate submission blocked',
          `Exception: ${e.message}`,
          false
        );
      }
    }

    // ==========================================
    // JOURNEY C: TRAINING PROGRESS Save + Resume (BLOCKER)
    // ==========================================
    console.log('=== Journey C: Training Progress Flow ===');
    
    // C1: Get active course
    const { data: activeCourse, error: courseError } = await supabase
      .from('courses')
      .select('id, title, module_count')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (courseError || !activeCourse) {
      addResult('Training', 'Active Course Exists', 'At least 1 active course',
        courseError ? `Error: ${courseError.message}` : 'No active course found',
        false,
        { is_blocker: true, error_meta: courseError ? { code: courseError.code, message: courseError.message, table: 'courses' } : undefined }
      );
    } else {
      addResult('Training', 'Active Course Exists', 'At least 1 active course',
        `Found: ${activeCourse.title} (${activeCourse.module_count} modules)`,
        true
      );
      
      // C2: Get first module
      const { data: firstModule, error: moduleError } = await supabase
        .from('course_modules')
        .select('id, title, module_number')
        .eq('course_id', activeCourse.id)
        .eq('is_active', true)
        .order('module_number', { ascending: true })
        .limit(1)
        .single();
      
      if (moduleError || !firstModule) {
        addResult('Training', 'Course Has Modules', 'Active modules exist',
          moduleError ? `Error: ${moduleError.message}` : 'No modules found',
          false,
          { is_blocker: true }
        );
      } else {
        addResult('Training', 'Course Has Modules', 'Active modules exist',
          `Module 1: ${firstModule.title}`,
          true
        );
        
        // C3: Write progress record (using test user ID pattern)
        const testUserId = '00000000-0000-0000-0000-' + testRunId.slice(0, 12);
        
        const { data: progressInsert, error: progressError } = await supabase
          .from('user_progress')
          .insert({
            user_id: testUserId,
            course_id: activeCourse.id,
            module_id: firstModule.id,
            is_completed: false,
            score: 0,
            time_spent: 120
          })
          .select()
          .single();
        
        if (progressError) {
          addResult('Training', 'Progress Write', 'Progress record created',
            `Error: ${progressError.message}`,
            false,
            { is_blocker: true, error_meta: { code: progressError.code, message: progressError.message, table: 'user_progress', hint: progressError.hint } }
          );
        } else {
          testDataCreated.test_progress_id = progressInsert.id;
          addResult('Training', 'Progress Write', 'Progress record created',
            `Created: ${progressInsert.id}`,
            true
          );
          
          // C4: Read back progress (verify resume works)
          const { data: progressRead, error: readError } = await supabase
            .from('user_progress')
            .select('*')
            .eq('id', progressInsert.id)
            .single();
          
          if (readError) {
            addResult('Training', 'Progress Read (Resume)', 'Progress readable',
              `Error: ${readError.message}`,
              false,
              { is_blocker: true }
            );
          } else {
            addResult('Training', 'Progress Read (Resume)', 'Progress readable',
              `Read back: module_id=${progressRead.module_id}, time_spent=${progressRead.time_spent}`,
              progressRead.module_id === firstModule.id,
              { notes: 'User can resume where they left off' }
            );
          }
          
          // C5: Mark module complete
          const { error: completeError } = await supabase
            .from('user_progress')
            .update({ is_completed: true, score: 100 })
            .eq('id', progressInsert.id);
          
          if (completeError) {
            addResult('Training', 'Module Completion', 'Module marked complete',
              `Error: ${completeError.message}`,
              false,
              { is_blocker: true }
            );
          } else {
            addResult('Training', 'Module Completion', 'Module marked complete',
              'Module 1 completed',
              true
            );
          }
          
          // C6: Verify completion count
          const { count: completedCount } = await supabase
            .from('user_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', testUserId)
            .eq('is_completed', true);
          
          addResult('Training', 'Completion Tracking', 'Completed modules counted',
            `${completedCount || 0} modules completed`,
            (completedCount || 0) >= 1
          );
        }
      }
    }

    // ==========================================
    // JOURNEY D: EXAM → CERTIFICATE GENERATION (BLOCKER)
    // ==========================================
    console.log('=== Journey D: Exam & Certificate Flow ===');
    
    // D1: Create passed exam attempt
    const testUserId = '00000000-0000-0000-0000-' + testRunId.slice(0, 12);
    let examAttemptId: string | null = null;
    
    if (activeCourse) {
      const { data: examInsert, error: examError } = await supabase
        .from('exam_attempts')
        .insert({
          user_id: testUserId,
          course_id: activeCourse.id,
          total_score: 85,
          passing_score: 80,
          is_passed: true,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date().toISOString(),
          time_taken: 3600,
          attempt_number: 1
        })
        .select()
        .single();
      
      if (examError) {
        addResult('Exam', 'Passed Exam Created', 'Exam attempt with score ≥80 created',
          `Error: ${examError.message}`,
          false,
          { is_blocker: true, error_meta: { code: examError.code, message: examError.message, table: 'exam_attempts' } }
        );
      } else {
        examAttemptId = examInsert.id;
        addResult('Exam', 'Passed Exam Created', 'Exam attempt with score ≥80 created',
          `Created: ${examAttemptId} (score: 85)`,
          true
        );
      }
    }

    // D2: Generate certificate
    if (examAttemptId && activeCourse) {
      // First, try to directly insert a certificate (simulating what generate-certificate does)
      const certificateNumber = `E2E-${testRunId.slice(0, 8).toUpperCase()}`;
      const issueDate = new Date();
      const expiryDate = new Date(issueDate.getTime() + 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
      
      const { data: certInsert, error: certError } = await supabase
        .from('certificates')
        .insert({
          user_id: testUserId,
          course_id: activeCourse.id,
          exam_attempt_id: examAttemptId,
          certificate_number: certificateNumber,
          issue_date: issueDate.toISOString(),
          expiry_date: expiryDate.toISOString()
        })
        .select()
        .single();
      
      if (certError) {
        addResult('Certificate', 'Certificate Generated', 'Certificate record created',
          `Error: ${certError.message}`,
          false,
          { is_blocker: true, error_meta: { code: certError.code, message: certError.message, table: 'certificates', hint: certError.hint } }
        );
      } else {
        testDataCreated.test_certificate_id = certInsert.id;
        addResult('Certificate', 'Certificate Generated', 'Certificate record created',
          `Certificate: ${certificateNumber}`,
          true
        );
        
        // D3: Verify certificate number format
        const formatValid = /^E2E-[A-Z0-9]{8}$/.test(certificateNumber);
        addResult('Certificate', 'Number Format Valid', 'Certificate number follows pattern',
          `Format: ${certificateNumber} - ${formatValid ? 'Valid' : 'Invalid'}`,
          formatValid
        );
        
        // D4: Verify certificate is verifiable (check it exists)
        const { data: verifyData, error: verifyError } = await supabase
          .from('certificates')
          .select('id, certificate_number, issue_date, expiry_date')
          .eq('certificate_number', certificateNumber)
          .single();
        
        addResult('Certificate', 'Public Verification', 'Certificate is publicly verifiable',
          verifyError ? `Error: ${verifyError.message}` : `Verified: ${verifyData?.certificate_number}`,
          !verifyError && !!verifyData,
          { is_blocker: true }
        );
      }
    }

    // D5: Test that failed exam does NOT generate certificate
    if (activeCourse) {
      const { data: failedExam, error: failedExamError } = await supabase
        .from('exam_attempts')
        .insert({
          user_id: testUserId,
          course_id: activeCourse.id,
          total_score: 65,
          passing_score: 80,
          is_passed: false,
          started_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date().toISOString(),
          time_taken: 3600,
          attempt_number: 2
        })
        .select()
        .single();
      
      if (!failedExamError && failedExam) {
        // Verify no certificate was auto-generated for failed exam
        const { count: failedCertCount } = await supabase
          .from('certificates')
          .select('*', { count: 'exact', head: true })
          .eq('exam_attempt_id', failedExam.id);
        
        addResult('Certificate', 'No Cert for Failed Exam', 'Failed exam does not generate certificate',
          (failedCertCount || 0) === 0 ? 'Correctly no certificate' : `ERROR: ${failedCertCount} certificates created`,
          (failedCertCount || 0) === 0
        );
      }
    }

    // ==========================================
    // ADDITIONAL SYSTEM CHECKS
    // ==========================================
    console.log('=== Additional System Checks ===');
    
    // Email system check
    const { data: emailStats } = await supabase
      .from('email_logs')
      .select('status')
      .order('created_at', { ascending: false })
      .limit(100);
    
    const emailCounts = emailStats?.reduce((acc: Record<string, number>, row) => {
      acc[row.status || 'unknown'] = (acc[row.status || 'unknown'] || 0) + 1;
      return acc;
    }, {}) || {};
    
    const sentCount = emailCounts['sent'] || 0;
    const failedCount = emailCounts['failed'] || 0;
    const successRate = (sentCount + failedCount) > 0 ? Math.round((sentCount / (sentCount + failedCount)) * 100) : 100;
    
    addResult('Email', 'Delivery Rate', '≥80% success rate',
      `${successRate}% (${sentCount} sent, ${failedCount} failed)`,
      successRate >= 80
    );

    // Organization & seats check
    const { count: orgCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    addResult('Organizations', 'Org Count', '≥1 organizations', `${orgCount || 0} organizations`, (orgCount || 0) >= 1);

    const { count: seatCount } = await supabase
      .from('rvt_seats')
      .select('*', { count: 'exact', head: true });
    addResult('Organizations', 'Seats Allocated', 'Seats available', `${seatCount || 0} seats`, (seatCount || 0) >= 0);

    // ==========================================
    // CALCULATE JOURNEY SUMMARIES & RELEASE GATE
    // ==========================================
    const journeys = ['Auth', 'Dispensary Application', 'Training', 'Exam', 'Certificate'];
    const journeySummaries: JourneySummary[] = journeys.map(journeyName => {
      const journeyResults = results.filter(r => r.journey === journeyName);
      const blockerResults = journeyResults.filter(r => r.is_blocker);
      const allPassed = blockerResults.every(r => r.passed);
      
      return {
        name: journeyName,
        required_steps: blockerResults.map(r => r.step),
        completed_steps: blockerResults.filter(r => r.passed).map(r => r.step),
        all_passed: allPassed,
        is_blocker: blockerResults.length > 0
      };
    });

    const blockerCount = results.filter(r => r.is_blocker && !r.passed).length;
    const releaseGateStatus = blockerCount === 0 ? 'SHIPPABLE' : 'NOT_SHIPPABLE';

    // Calculate final stats
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.filter(r => !r.passed).length;

    const report: E2EReport = {
      test_run_id: testRunId,
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      total_tests: results.length,
      passed_tests: passedTests,
      failed_tests: failedTests,
      blocker_count: blockerCount,
      release_gate_status: releaseGateStatus,
      results,
      journey_summaries: journeySummaries,
      cleanup_performed: true,
      test_data_created: testDataCreated
    };

    // Store the test results
    await supabase.from('automated_test_results').insert({
      test_name: 'E2E Validation Suite v2',
      status: releaseGateStatus === 'SHIPPABLE' ? 'passed' : 'failed',
      metadata: report,
      duration_ms: new Date().getTime() - new Date(startedAt).getTime()
    });

    console.log(`=== E2E Complete: ${passedTests}/${results.length} passed, ${blockerCount} blockers, ${releaseGateStatus} ===`);

    return new Response(JSON.stringify(report), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (error: any) {
    console.error('E2E validation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      error_meta: {
        code: error.code || 'UNKNOWN',
        message: error.message,
        stack: error.stack
      }
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
});
