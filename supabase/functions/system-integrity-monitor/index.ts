import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrityCheck {
  check_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_entity_type: string;
  affected_entity_id?: string;
  issue_description: string;
  technical_details: any;
  suggested_fix: string;
  auto_fixable: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const checks: IntegrityCheck[] = [];
    const startTime = Date.now();

    // CHECK 1: Manager accounts missing for approved applications
    console.log('Running check: Manager accounts for approved applications');
    const { data: approvedApps, error: appsError } = await supabaseClient
      .from('dispensary_applications')
      .select('id, organization_id, contact_email, contact_person, organization_name, reviewed_at')
      .eq('application_status', 'approved');

    if (!appsError && approvedApps) {
      for (const app of approvedApps) {
        if (!app.organization_id) continue;

        // Check if manager account exists
        const { data: managerProfile } = await supabaseClient
          .from('profiles')
          .select('user_id, organization_id')
          .eq('organization_id', app.organization_id)
          .limit(1)
          .single();

        if (!managerProfile) {
          checks.push({
            check_type: 'missing_manager_account',
            severity: 'critical',
            affected_entity_type: 'dispensary_application',
            affected_entity_id: app.id,
            issue_description: `Approved application "${app.organization_name}" has no manager account`,
            technical_details: {
              application_id: app.id,
              organization_id: app.organization_id,
              contact_email: app.contact_email,
              approved_at: app.reviewed_at
            },
            suggested_fix: `Create manager account for ${app.contact_email} and link to organization ${app.organization_id}`,
            auto_fixable: true
          });
        }
      }
    }

    // CHECK 2: Organizations with payment but no join codes
    console.log('Running check: Missing join codes for paid organizations');
    const { data: paidOrgs, error: paidError } = await supabaseClient
      .from('organizations')
      .select('id, name, payment_status, course_credits')
      .eq('payment_status', 'paid')
      .eq('admin_approved', true);

    if (!paidError && paidOrgs) {
      for (const org of paidOrgs) {
        const { data: joinCodes } = await supabaseClient
          .from('rvt_join_codes')
          .select('id')
          .eq('organization_id', org.id)
          .eq('is_active', true);

        if (!joinCodes || joinCodes.length === 0) {
          checks.push({
            check_type: 'missing_join_code',
            severity: 'high',
            affected_entity_type: 'organization',
            affected_entity_id: org.id,
            issue_description: `Organization "${org.name}" has paid but no active join codes`,
            technical_details: {
              organization_id: org.id,
              payment_status: org.payment_status,
              credits: org.course_credits
            },
            suggested_fix: `Generate join code for organization ${org.name}`,
            auto_fixable: true
          });
        }
      }
    }

    // CHECK 3: Seats purchased but not allocated
    console.log('Running check: Unallocated purchased seats');
    const { data: purchases, error: purchasesError } = await supabaseClient
      .from('rvt_purchases')
      .select('id, organization_id, quantity, status, completed_at')
      .eq('status', 'completed');

    if (!purchasesError && purchases) {
      for (const purchase of purchases) {
        const { data: seats } = await supabaseClient
          .from('rvt_seats')
          .select('id, status')
          .eq('organization_id', purchase.organization_id);

        const allocatedCount = seats?.length || 0;
        
        if (allocatedCount < purchase.quantity) {
          checks.push({
            check_type: 'missing_seats',
            severity: 'high',
            affected_entity_type: 'rvt_purchase',
            affected_entity_id: purchase.id,
            issue_description: `Purchase has ${purchase.quantity} seats but only ${allocatedCount} allocated`,
            technical_details: {
              purchase_id: purchase.id,
              organization_id: purchase.organization_id,
              expected_seats: purchase.quantity,
              actual_seats: allocatedCount,
              missing_seats: purchase.quantity - allocatedCount
            },
            suggested_fix: `Allocate ${purchase.quantity - allocatedCount} additional seats`,
            auto_fixable: true
          });
        }
      }
    }

    // CHECK 4: Incomplete user profiles (registered but missing required fields)
    console.log('Running check: Incomplete user profiles');
    const { data: incompleteProfiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('user_id, first_name, last_name, organization_id, created_at')
      .or('first_name.is.null,last_name.is.null');

    if (!profilesError && incompleteProfiles && incompleteProfiles.length > 0) {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      
      for (const profile of incompleteProfiles) {
        const createdAt = new Date(profile.created_at);
        if (createdAt < twoDaysAgo) {
          checks.push({
            check_type: 'incomplete_profile',
            severity: 'medium',
            affected_entity_type: 'profile',
            affected_entity_id: profile.user_id,
            issue_description: 'User registered over 2 days ago but profile incomplete',
            technical_details: {
              user_id: profile.user_id,
              missing_fields: {
                first_name: !profile.first_name,
                last_name: !profile.last_name
              },
              days_since_registration: Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
            },
            suggested_fix: 'Send profile completion reminder email',
            auto_fixable: false
          });
        }
      }
    }

    // CHECK 5: Failed email deliveries
    console.log('Running check: Failed email deliveries');
    const { data: failedEmails, error: emailsError } = await supabaseClient
      .from('communication_logs')
      .select('id, recipient_email, subject, status, error_message, created_at')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!emailsError && failedEmails && failedEmails.length > 0) {
      for (const email of failedEmails) {
        checks.push({
          check_type: 'failed_email',
          severity: 'medium',
          affected_entity_type: 'communication_log',
          affected_entity_id: email.id,
          issue_description: `Email to ${email.recipient_email} failed: ${email.subject}`,
          technical_details: {
            recipient: email.recipient_email,
            subject: email.subject,
            error: email.error_message,
            failed_at: email.created_at
          },
          suggested_fix: 'Retry email delivery with fallback provider',
          auto_fixable: true
        });
      }
    }

    // CHECK 6: Orphaned seats (assigned but user doesn't exist)
    console.log('Running check: Orphaned seat assignments');
    const { data: assignedSeats, error: seatsError } = await supabaseClient
      .from('rvt_seats')
      .select('id, assigned_user_id, organization_id, status')
      .eq('status', 'assigned')
      .not('assigned_user_id', 'is', null);

    if (!seatsError && assignedSeats) {
      for (const seat of assignedSeats) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('user_id')
          .eq('user_id', seat.assigned_user_id!)
          .single();

        if (!profile) {
          checks.push({
            check_type: 'orphaned_seat',
            severity: 'medium',
            affected_entity_type: 'rvt_seat',
            affected_entity_id: seat.id,
            issue_description: 'Seat assigned to non-existent user',
            technical_details: {
              seat_id: seat.id,
              assigned_user_id: seat.assigned_user_id,
              organization_id: seat.organization_id
            },
            suggested_fix: 'Release seat back to available pool',
            auto_fixable: true
          });
        }
      }
    }

    // CHECK 7: Payment verification timeout
    console.log('Running check: Stuck payment verifications');
    const { data: pendingPayments, error: paymentsError } = await supabaseClient
      .from('rvt_purchases')
      .select('id, organization_id, paypal_order_id, created_at')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()); // > 30 min old

    if (!paymentsError && pendingPayments && pendingPayments.length > 0) {
      for (const payment of pendingPayments) {
        checks.push({
          check_type: 'stuck_payment',
          severity: 'high',
          affected_entity_type: 'rvt_purchase',
          affected_entity_id: payment.id,
          issue_description: 'Payment verification pending for over 30 minutes',
          technical_details: {
            purchase_id: payment.id,
            paypal_order_id: payment.paypal_order_id,
            pending_since: payment.created_at,
            minutes_pending: Math.floor((Date.now() - new Date(payment.created_at).getTime()) / (1000 * 60))
          },
          suggested_fix: 'Retry PayPal verification or cancel order',
          auto_fixable: true
        });
      }
    }

    // Insert new checks into database
    let insertedCount = 0;
    for (const check of checks) {
      // Check if this issue already exists and is not resolved
      const { data: existingCheck } = await supabaseClient
        .from('system_integrity_checks')
        .select('id, status')
        .eq('check_type', check.check_type)
        .eq('affected_entity_id', check.affected_entity_id || '')
        .in('status', ['detected', 'investigating'])
        .single();

      if (!existingCheck) {
        const { error: insertError } = await supabaseClient
          .from('system_integrity_checks')
          .insert({
            ...check,
            status: 'detected'
          });

        if (!insertError) {
          insertedCount++;
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log(`Integrity check complete: ${checks.length} issues found, ${insertedCount} new`);

    return new Response(
      JSON.stringify({
        success: true,
        checks_performed: 7,
        issues_found: checks.length,
        new_issues: insertedCount,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
        summary: {
          critical: checks.filter(c => c.severity === 'critical').length,
          high: checks.filter(c => c.severity === 'high').length,
          medium: checks.filter(c => c.severity === 'medium').length,
          low: checks.filter(c => c.severity === 'low').length,
          auto_fixable: checks.filter(c => c.auto_fixable).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Integrity monitor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
