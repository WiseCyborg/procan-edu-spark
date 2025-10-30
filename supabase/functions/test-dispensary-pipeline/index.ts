import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestResult {
  step: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  duration_ms: number;
  details?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const results: TestResult[] = [];
  const testId = `test-${Date.now()}`;

  try {
    // Test 1: Database Connectivity
    const dbStart = Date.now();
    try {
      const { error } = await supabase
        .from('dispensary_applications')
        .select('id')
        .limit(1);
      
      results.push({
        step: 'database_connectivity',
        status: error ? 'fail' : 'pass',
        message: error ? `Database error: ${error.message}` : 'Database connection successful',
        duration_ms: Date.now() - dbStart,
        details: { error: error?.message }
      });
    } catch (error: any) {
      results.push({
        step: 'database_connectivity',
        status: 'fail',
        message: `Database test failed: ${error.message}`,
        duration_ms: Date.now() - dbStart
      });
    }

    // Test 2: Application Submission
    const submitStart = Date.now();
    try {
      const { data: testApp, error: submitError } = await supabase
        .from('dispensary_applications')
        .insert({
          organization_name: `Test Org ${testId}`,
          legal_entity_name: `Test Legal ${testId}`,
          license_type: 'Adult Use',
          license_number: `TEST-${testId}`,
          contact_person: 'Test Manager',
          contact_email: `test-${testId}@example.com`,
          contact_phone: '410-555-0100',
          address: '123 Test St, Baltimore, MD 21201',
          application_status: 'pending',
          compliance_affirmation: true
        })
        .select()
        .single();

      results.push({
        step: 'application_submission',
        status: submitError ? 'fail' : 'pass',
        message: submitError ? `Submission failed: ${submitError.message}` : 'Application submitted successfully',
        duration_ms: Date.now() - submitStart,
        details: { application_id: testApp?.id, error: submitError?.message }
      });

      // Test 3: Confirmation Email Function
      if (testApp) {
        const emailStart = Date.now();
        try {
          const { data: emailResult, error: emailError } = await supabase.functions.invoke(
            'send-application-confirmation',
            {
              body: {
                application_id: testApp.id,
                contact_person: 'Test Manager',
                contact_email: `test-${testId}@example.com`,
                organization_name: `Test Org ${testId}`,
                license_number: `TEST-${testId}`
              }
            }
          );

          results.push({
            step: 'confirmation_email',
            status: emailError ? 'warning' : 'pass',
            message: emailError ? `Email function error: ${emailError.message}` : 'Confirmation email sent',
            duration_ms: Date.now() - emailStart,
            details: { result: emailResult, error: emailError?.message }
          });
        } catch (error: any) {
          results.push({
            step: 'confirmation_email',
            status: 'warning',
            message: `Email test failed: ${error.message}`,
            duration_ms: Date.now() - emailStart
          });
        }

        // Test 4: Approval Process
        const approvalStart = Date.now();
        try {
          const { error: approvalError } = await supabase
            .from('dispensary_applications')
            .update({ application_status: 'approved' })
            .eq('id', testApp.id);

          results.push({
            step: 'approval_process',
            status: approvalError ? 'fail' : 'pass',
            message: approvalError ? `Approval failed: ${approvalError.message}` : 'Application approved successfully',
            duration_ms: Date.now() - approvalStart
          });
        } catch (error: any) {
          results.push({
            step: 'approval_process',
            status: 'fail',
            message: `Approval test failed: ${error.message}`,
            duration_ms: Date.now() - approvalStart
          });
        }

        // Test 5: Organization Creation
        const orgStart = Date.now();
        try {
          const { data: testOrg, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: `Test Org ${testId}`,
              organization_type: 'dispensary',
              status: 'active'
            })
            .select()
            .single();

          results.push({
            step: 'organization_creation',
            status: orgError ? 'fail' : 'pass',
            message: orgError ? `Org creation failed: ${orgError.message}` : 'Organization created successfully',
            duration_ms: Date.now() - orgStart,
            details: { organization_id: testOrg?.id }
          });

          // Link application to organization
          if (testOrg) {
            await supabase
              .from('dispensary_applications')
              .update({ organization_id: testOrg.id })
              .eq('id', testApp.id);
          }
        } catch (error: any) {
          results.push({
            step: 'organization_creation',
            status: 'fail',
            message: `Org test failed: ${error.message}`,
            duration_ms: Date.now() - orgStart
          });
        }

        // Cleanup: Delete test data
        try {
          await supabase
            .from('dispensary_applications')
            .delete()
            .eq('id', testApp.id);
          
          const { data: orgs } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', `Test Org ${testId}`);
          
          if (orgs && orgs.length > 0) {
            await supabase
              .from('organizations')
              .delete()
              .in('id', orgs.map(o => o.id));
          }
        } catch (cleanupError: any) {
          console.warn('Cleanup error:', cleanupError);
        }
      }
    } catch (error: any) {
      results.push({
        step: 'application_submission',
        status: 'fail',
        message: `Submission test failed: ${error.message}`,
        duration_ms: Date.now() - submitStart
      });
    }

    // Calculate summary
    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'pass').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const warnings = results.filter(r => r.status === 'warning').length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);

    const summary = {
      test_id: testId,
      timestamp: new Date().toISOString(),
      total_tests: totalTests,
      passed,
      failed,
      warnings,
      success_rate: totalTests > 0 ? (passed / totalTests) * 100 : 0,
      total_duration_ms: totalDuration,
      overall_status: failed > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed'
    };

    console.log('Pipeline Test Summary:', summary);
    console.log('Detailed Results:', results);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Pipeline test error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
