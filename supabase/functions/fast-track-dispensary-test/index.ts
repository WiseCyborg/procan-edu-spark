import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { test_email, organization_name, employee_count, auto_complete_course } = await req.json();

    console.log('🚀 Starting Fast Track Dispensary Test');
    console.log('📧 Test email:', test_email);
    console.log('🏢 Organization:', organization_name);
    console.log('👥 Employees:', employee_count);

    const emailsSent: Array<{type: string; to: string; status: string}> = [];

    // STEP 1: Create dispensary application
    const { data: application, error: appError } = await supabaseClient
      .from('dispensary_applications')
      .insert({
        organization_name,
        contact_person: 'Test Manager',
        contact_email: test_email,
        contact_phone: '555-TEST-001',
        license_number: `TEST-${Date.now()}`,
        address: '123 Test Street, Baltimore, MD 21201',
        estimated_employees: employee_count,
        compliance_affirmation: true,
        application_status: 'pending'
      })
      .select()
      .single();

    if (appError) throw appError;
    console.log('✅ Application created:', application.id);

    // STEP 2: Send application confirmation
    try {
      await supabaseClient.functions.invoke('send-application-confirmation', {
        body: {
          application_id: application.id,
          contact_person: 'Test Manager',
          contact_email: test_email,
          organization_name,
          license_number: application.license_number
        }
      });
      emailsSent.push({ type: 'application_confirmation', to: test_email, status: 'sent' });
    } catch (e) {
      console.warn('Email send skipped:', e);
      emailsSent.push({ type: 'application_confirmation', to: test_email, status: 'skipped' });
    }

    // STEP 3: Auto-approve and create organization
    const accessKey = `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const joinCode = `JOIN-TEST-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

    const { data: organization, error: orgError } = await supabaseClient
      .from('organizations')
      .insert({
        name: organization_name,
        contact_person: 'Test Manager',
        contact_email: test_email,
        contact_phone: '555-TEST-001',
        address: '123 Test Street, Baltimore, MD 21201',
        unique_access_key: accessKey,
        course_credits: employee_count,
        admin_approved: true,
        payment_status: 'test'
      })
      .select()
      .single();

    if (orgError) throw orgError;
    console.log('✅ Organization created:', organization.id);

    // Update application with org ID
    await supabaseClient
      .from('dispensary_applications')
      .update({
        application_status: 'approved',
        organization_id: organization.id
      })
      .eq('id', application.id);

    // STEP 4: Create training seats
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('rvt_purchases')
      .insert({
        organization_id: organization.id,
        quantity: employee_count,
        amount_paid: 0,
        payment_method: 'test',
        idempotency_key: `TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        status: 'paid'
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Get RVT course (the dispensary training course)
    const { data: course, error: courseError } = await supabaseClient
      .from('courses')
      .select('id')
      .eq('is_active', true)
      .eq('course_type', 'rvt')
      .single();

    if (courseError) {
      // Fallback: get the Maryland RVT course by title
      const { data: fallbackCourse } = await supabaseClient
        .from('courses')
        .select('id')
        .ilike('title', '%Responsible Vendor%')
        .single();
      if (!fallbackCourse) throw new Error('No RVT course found');
      var courseId = fallbackCourse.id;
    } else {
      var courseId = course.id;
    }

    // Create seats
    const seats = Array.from({ length: employee_count }, () => ({
      purchase_id: purchase.id,
      organization_id: organization.id,
      course_id: courseId,
      status: 'available'
    }));

    await supabaseClient.from('rvt_seats').insert(seats);

    // STEP 5: Create join code
    await supabaseClient.from('rvt_join_codes').insert({
      organization_id: organization.id,
      code: joinCode,
      max_uses: employee_count * 3,
      current_uses: 0,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      is_active: true
    });

    console.log('✅ Training seats and join code created');

    // STEP 6: Create manager account
    const managerEmail = test_email.includes('+') 
      ? test_email.replace('+', '+manager-')
      : test_email.replace('@', '+manager@');
    const managerPassword = `Test${Date.now()}!`;

    const { data: managerAuth } = await supabaseClient.auth.admin.createUser({
      email: managerEmail,
      password: managerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: 'Test',
        last_name: 'Manager'
      }
    });

    if (managerAuth.user) {
      await supabaseClient.from('profiles').update({
        organization_id: organization.id,
        first_name: 'Test',
        last_name: 'Manager'
      }).eq('user_id', managerAuth.user.id);

      await supabaseClient.from('user_roles').insert({
        user_id: managerAuth.user.id,
        role: 'dispensary_manager'
      });

      emailsSent.push({ type: 'manager_welcome', to: managerEmail, status: 'skipped' });
    }

    // STEP 7: Create employee accounts
    const employeeIds: string[] = [];
    for (let i = 1; i <= employee_count; i++) {
      const empEmail = test_email.includes('+')
        ? test_email.replace('+', `+emp${i}-`)
        : test_email.replace('@', `+emp${i}@`);

      const { data: empAuth } = await supabaseClient.auth.admin.createUser({
        email: empEmail,
        password: `Test${Date.now()}${i}!`,
        email_confirm: true,
        user_metadata: {
          first_name: `Employee${i}`,
          last_name: 'Test'
        }
      });

      if (empAuth.user) {
        employeeIds.push(empAuth.user.id);
        
        await supabaseClient.from('profiles').update({
          organization_id: organization.id,
          first_name: `Employee${i}`,
          last_name: 'Test'
        }).eq('user_id', empAuth.user.id);

        emailsSent.push({ type: 'employee_invitation', to: empEmail, status: 'skipped' });
      }
    }

    console.log(`✅ Created ${employeeIds.length} employee accounts`);

    // STEP 8: Create entitlements for all employees
    for (const empId of employeeIds) {
      const { error: entError } = await supabaseClient
        .from('course_entitlements')
        .upsert({
          user_id: empId,
          course_id: courseId,
          source: 'org_seat',
          status: 'active',
          purchased_at: new Date().toISOString(),
          metadata: { organization_id: organization.id }
        }, { onConflict: 'user_id,course_id' });

      if (entError) {
        console.warn('Entitlement creation error for', empId, entError);
      }
    }
    console.log(`✅ Created ${employeeIds.length} course entitlements`);

    return new Response(
      JSON.stringify({
        success: true,
        organization_id: organization.id,
        application_id: application.id,
        access_info: {
          manager_email: managerEmail,
          manager_password: managerPassword,
          join_code: joinCode,
          unique_access_key: accessKey
        },
        emails_sent: emailsSent,
        employee_ids: employeeIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ Fast track test failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
