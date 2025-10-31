import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'warning';
  duration: number;
  message: string;
  details?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: TestResult[] = [];
  let testOrgId: string | null = null;
  let testAppId: string | null = null;

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log('🧪 Starting End-to-End Pipeline Test...');

    // Step 1: Create Test Application
    console.log('Step 1: Creating test application...');
    const step1Start = Date.now();
    const { data: testApp, error: appError } = await supabase
      .from('dispensary_applications')
      .insert({
        organization_name: `E2E Test Org ${Date.now()}`,
        contact_person: 'Test Manager',
        contact_email: `test-${Date.now()}@procannedu.test`,
        contact_phone: '555-TEST-E2E',
        address: '123 Test Street',
        license_number: `TEST-E2E-${Date.now()}`,
        application_status: 'pending'
      })
      .select()
      .single();

    if (appError) throw new Error(`Application creation failed: ${appError.message}`);
    testAppId = testApp.id;

    results.push({
      step: 'Application Submission',
      status: 'success',
      duration: Date.now() - step1Start,
      message: 'Test application created successfully',
      details: { application_id: testAppId }
    });

    // Step 2: Auto-Approve Application
    console.log('Step 2: Approving application...');
    const step2Start = Date.now();
    const { data: approvalResult, error: approvalError } = await supabase
      .rpc('approve_dispensary_application', {
        application_id: testAppId,
        credits: 5
      })
      .single();

    if (approvalError) throw new Error(`Approval failed: ${approvalError.message}`);
    testOrgId = approvalResult.organization_id;

    results.push({
      step: 'Admin Approval',
      status: 'success',
      duration: Date.now() - step2Start,
      message: 'Application approved with organization created',
      details: {
        organization_id: testOrgId,
        access_key: approvalResult.access_key
      }
    });

    // Step 3: Verify Seats Created
    console.log('Step 3: Verifying seat allocation...');
    const step3Start = Date.now();
    const { data: seats, error: seatsError } = await supabase
      .from('rvt_seats')
      .select('*')
      .eq('organization_id', testOrgId);

    if (seatsError) throw new Error(`Seats verification failed: ${seatsError.message}`);

    results.push({
      step: 'Seat Allocation',
      status: seats && seats.length > 0 ? 'success' : 'error',
      duration: Date.now() - step3Start,
      message: `${seats?.length || 0} training seats allocated`,
      details: { seats_count: seats?.length }
    });

    // Step 4: Verify Join Code Created
    console.log('Step 4: Verifying join code...');
    const step4Start = Date.now();
    const { data: joinCodes, error: joinError } = await supabase
      .from('rvt_join_codes')
      .select('*')
      .eq('organization_id', testOrgId)
      .eq('is_active', true);

    if (joinError) throw new Error(`Join code verification failed: ${joinError.message}`);

    results.push({
      step: 'Join Code Generation',
      status: joinCodes && joinCodes.length > 0 ? 'success' : 'error',
      duration: Date.now() - step4Start,
      message: `Join code ${joinCodes && joinCodes.length > 0 ? 'created successfully' : 'not found'}`,
      details: { join_code: joinCodes?.[0]?.code }
    });

    // Step 5: Verify Registration Token
    console.log('Step 5: Verifying registration token...');
    const step5Start = Date.now();
    const { data: updatedApp, error: tokenError } = await supabase
      .from('dispensary_applications')
      .select('registration_token, registration_token_expires_at')
      .eq('id', testAppId)
      .single();

    if (tokenError) throw new Error(`Token verification failed: ${tokenError.message}`);

    results.push({
      step: 'Registration Token',
      status: updatedApp?.registration_token ? 'success' : 'error',
      duration: Date.now() - step5Start,
      message: `Registration token ${updatedApp?.registration_token ? 'generated' : 'missing'}`,
      details: {
        has_token: !!updatedApp?.registration_token,
        expires_at: updatedApp?.registration_token_expires_at
      }
    });

    // Step 6: Test Email System (send-application-confirmation)
    console.log('Step 6: Testing email system...');
    const step6Start = Date.now();
    try {
      const { error: emailError } = await supabase.functions.invoke(
        'send-application-confirmation',
        {
          body: {
            application_id: testAppId,
            contact_person: 'Test Manager',
            contact_email: `test-${Date.now()}@procannedu.test`,
            organization_name: testApp.organization_name,
            license_number: testApp.license_number
          }
        }
      );

      results.push({
        step: 'Email System',
        status: emailError ? 'warning' : 'success',
        duration: Date.now() - step6Start,
        message: emailError ? 'Email system may have issues' : 'Email system functional',
        details: { error: emailError?.message }
      });
    } catch (emailErr: any) {
      results.push({
        step: 'Email System',
        status: 'warning',
        duration: Date.now() - step6Start,
        message: 'Email test failed (non-critical)',
        details: { error: emailErr.message }
      });
    }

    // Cleanup: Mark test org for deletion
    console.log('Cleanup: Marking test organization for cleanup...');
    if (testOrgId) {
      await supabase
        .from('organizations')
        .update({
          admin_approved: false,
          payment_status: 'test',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // Expires in 24h
        })
        .eq('id', testOrgId);
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;

    console.log('✅ Pipeline test complete!');
    console.log(`Total duration: ${totalDuration}ms`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}, Warnings: ${warningCount}`);

    return new Response(
      JSON.stringify({
        success: errorCount === 0,
        summary: {
          total_steps: results.length,
          successful: successCount,
          errors: errorCount,
          warnings: warningCount,
          total_duration_ms: totalDuration
        },
        test_data: {
          organization_id: testOrgId,
          application_id: testAppId
        },
        results
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Pipeline test error:", error);

    // Attempt cleanup on error
    if (testOrgId) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        await supabase
          .from('organizations')
          .delete()
          .eq('id', testOrgId);
      } catch (cleanupErr) {
        console.error('Cleanup failed:', cleanupErr);
      }
    }

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
