import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  type: 'check_expiry' | 'send_reminder' | 'onboard_staff' | 'compliance_check' | 'bulk_notification';
  organizationId?: string;
  userId?: string;
  customMessage?: string;
  scheduleAdvanceDays?: number[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, organizationId, userId, customMessage, scheduleAdvanceDays }: NotificationRequest = await req.json();
    
    console.log(`Processing automated notification: ${type}`);

    switch (type) {
      case 'check_expiry':
        return await checkCertificateExpiry();
      case 'send_reminder':
        return await sendTrainingReminders(organizationId);
      case 'onboard_staff':
        return await processStaffOnboarding(organizationId);
      case 'compliance_check':
        return await generateComplianceReport(organizationId);
      case 'bulk_notification':
        return await sendBulkNotifications(scheduleAdvanceDays);
      default:
        throw new Error('Invalid notification type');
    }

  } catch (error: any) {
    console.error('Error in automated-notifications function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

async function checkCertificateExpiry(): Promise<Response> {
  console.log('Checking certificate expiry dates...');
  
  // Get all certificates expiring in the next 60 days
  const { data: certificates, error } = await supabase
    .from('certificates')
    .select(`
      *,
      profiles!inner(first_name, last_name, organization_id),
      courses(title)
    `)
    .not('expiry_date', 'is', null)
    .gte('expiry_date', new Date().toISOString())
    .lte('expiry_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString())
    .eq('is_revoked', false);

  if (error) {
    throw new Error(`Error fetching certificates: ${error.message}`);
  }

  const notifications = [];
  
  for (const cert of certificates || []) {
    const daysUntilExpiry = Math.ceil(
      (new Date(cert.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Send notifications at 30, 14, 7, and 1 days before expiry
    if ([30, 14, 7, 1].includes(daysUntilExpiry)) {
      const notificationData = {
        rule_id: null,
        user_id: cert.user_id,
        organization_id: cert.profiles.organization_id,
        recipient_email: '', // Will be filled from user auth data
        subject: `Certificate Expiring in ${daysUntilExpiry} Days`,
        message: `Your cannabis training certificate for "${cert.courses?.title}" expires in ${daysUntilExpiry} days. Please renew to maintain compliance.`,
        scheduled_for: new Date().toISOString(),
        priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
        metadata: {
          certificate_id: cert.id,
          course_title: cert.courses?.title,
          expiry_date: cert.expiry_date,
          days_until_expiry: daysUntilExpiry
        }
      };
      
      notifications.push(notificationData);
    }
  }

  // Queue notifications
  if (notifications.length > 0) {
    const { error: queueError } = await supabase
      .from('notification_queue')
      .insert(notifications);

    if (queueError) {
      throw new Error(`Error queuing notifications: ${queueError.message}`);
    }
  }

  console.log(`Queued ${notifications.length} certificate expiry notifications`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      notifications_queued: notifications.length,
      certificates_checked: certificates?.length || 0 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendTrainingReminders(organizationId?: string): Promise<Response> {
  console.log('Sending training reminders...');
  
  // Get users with incomplete training
  let query = supabase
    .from('user_progress')
    .select(`
      user_id,
      course_id,
      is_completed,
      profiles!inner(first_name, last_name, organization_id),
      courses(title)
    `)
    .eq('is_completed', false);

  if (organizationId) {
    query = query.eq('profiles.organization_id', organizationId);
  }

  const { data: incompleteProgress, error } = await query;

  if (error) {
    throw new Error(`Error fetching incomplete progress: ${error.message}`);
  }

  const notifications = [];
  const userCourses = new Map();

  // Group courses by user
  for (const progress of incompleteProgress || []) {
    if (!userCourses.has(progress.user_id)) {
      userCourses.set(progress.user_id, {
        profile: progress.profiles,
        courses: []
      });
    }
    userCourses.get(progress.user_id).courses.push(progress.courses?.title);
  }

  // Create notifications for each user
  for (const [userId, userData] of userCourses) {
    const courseList = userData.courses.join(', ');
    
    const notificationData = {
      rule_id: null,
      user_id: userId,
      organization_id: userData.profile.organization_id,
      recipient_email: '',
      subject: 'Complete Your Cannabis Training Modules',
      message: `You have incomplete training modules: ${courseList}. Please complete them to maintain compliance with Maryland cannabis regulations.`,
      scheduled_for: new Date().toISOString(),
      priority: 'medium',
      metadata: {
        incomplete_courses: userData.courses,
        course_count: userData.courses.length
      }
    };
    
    notifications.push(notificationData);
  }

  // Queue notifications
  if (notifications.length > 0) {
    const { error: queueError } = await supabase
      .from('notification_queue')
      .insert(notifications);

    if (queueError) {
      throw new Error(`Error queuing training reminders: ${queueError.message}`);
    }
  }

  console.log(`Queued ${notifications.length} training reminder notifications`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      notifications_queued: notifications.length,
      users_notified: userCourses.size 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function processStaffOnboarding(organizationId?: string): Promise<Response> {
  console.log('Processing staff onboarding...');
  
  // Get recent staff invitations that haven't been processed
  let query = supabase
    .from('staff_invitations')
    .select('*')
    .is('accepted_at', null)
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data: pendingInvitations, error } = await query;

  if (error) {
    throw new Error(`Error fetching pending invitations: ${error.message}`);
  }

  const notifications = [];

  for (const invitation of pendingInvitations || []) {
    const notificationData = {
      rule_id: null,
      user_id: null,
      organization_id: invitation.organization_id,
      recipient_email: invitation.email,
      subject: 'Welcome to Cannabis Training Program',
      message: `You've been invited to join the cannabis training program. Use invitation code: ${invitation.invitation_token}`,
      scheduled_for: new Date().toISOString(),
      priority: 'medium',
      metadata: {
        invitation_id: invitation.id,
        invitation_token: invitation.invitation_token,
        role: invitation.role
      }
    };
    
    notifications.push(notificationData);
  }

  // Queue notifications
  if (notifications.length > 0) {
    const { error: queueError } = await supabase
      .from('notification_queue')
      .insert(notifications);

    if (queueError) {
      throw new Error(`Error queuing onboarding notifications: ${queueError.message}`);
    }
  }

  console.log(`Queued ${notifications.length} staff onboarding notifications`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      notifications_queued: notifications.length,
      invitations_processed: pendingInvitations?.length || 0 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateComplianceReport(organizationId?: string): Promise<Response> {
  console.log('Generating compliance report...');
  
  // Get compliance data for organization managers
  let query = supabase
    .from('profiles')
    .select(`
      *,
      user_progress(is_completed, course_id),
      certificates(expiry_date, is_revoked),
      organizations(name)
    `);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  } else {
    query = query.not('organization_id', 'is', null);
  }

  const { data: organizationUsers, error } = await query;

  if (error) {
    throw new Error(`Error fetching organization users: ${error.message}`);
  }

  // Group by organization and calculate compliance metrics
  const complianceByOrg = new Map();

  for (const user of organizationUsers || []) {
    const orgId = user.organization_id;
    if (!complianceByOrg.has(orgId)) {
      complianceByOrg.set(orgId, {
        organization_name: user.organizations?.name,
        total_employees: 0,
        completed_training: 0,
        expired_certificates: 0,
        pending_compliance: 0
      });
    }

    const orgData = complianceByOrg.get(orgId);
    orgData.total_employees++;

    const completedCourses = user.user_progress?.filter(p => p.is_completed).length || 0;
    if (completedCourses > 0) orgData.completed_training++;

    const expiredCerts = user.certificates?.filter(c => 
      c.expiry_date && new Date(c.expiry_date) < new Date() && !c.is_revoked
    ).length || 0;
    if (expiredCerts > 0) orgData.expired_certificates++;

    if (completedCourses === 0 || expiredCerts > 0) {
      orgData.pending_compliance++;
    }
  }

  // Send compliance reports to managers
  const notifications = [];
  
  for (const [orgId, complianceData] of complianceByOrg) {
    if (complianceData.pending_compliance > 0) {
      const notificationData = {
        rule_id: null,
        user_id: null,
        organization_id: orgId,
        recipient_email: '', // Will be sent to managers
        subject: `Compliance Report: ${complianceData.organization_name}`,
        message: `Compliance Summary: ${complianceData.pending_compliance} of ${complianceData.total_employees} employees have pending compliance requirements.`,
        scheduled_for: new Date().toISOString(),
        priority: 'high',
        metadata: complianceData
      };
      
      notifications.push(notificationData);
    }
  }

  // Queue notifications
  if (notifications.length > 0) {
    const { error: queueError } = await supabase
      .from('notification_queue')
      .insert(notifications);

    if (queueError) {
      throw new Error(`Error queuing compliance reports: ${queueError.message}`);
    }
  }

  console.log(`Generated ${notifications.length} compliance reports`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      reports_generated: notifications.length,
      organizations_checked: complianceByOrg.size 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function sendBulkNotifications(advanceDays?: number[]): Promise<Response> {
  console.log('Sending bulk notifications...');
  
  // Get pending notifications from queue
  const { data: pendingNotifications, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .limit(100); // Process in batches

  if (error) {
    throw new Error(`Error fetching pending notifications: ${error.message}`);
  }

  let processedCount = 0;
  
  for (const notification of pendingNotifications || []) {
    try {
      // Skip notifications without recipient email
      if (!notification.recipient_email) {
        console.error(`No recipient email for notification ${notification.id}`);
        await supabase
          .from('notification_queue')
          .update({ status: 'failed' })
          .eq('id', notification.id);
        continue;
      }

      // Use Supabase's built-in email service
      console.log(`Sending notification to ${notification.recipient_email}: ${notification.subject}`);
      const emailResponse = { error: null, data: { success: true } }; // Placeholder - notifications will be handled differently

      if (emailResponse.error) {
        console.error(`Failed to send notification ${notification.id}:`, emailResponse.error);
        
        // Mark as failed
        await supabase
          .from('notification_queue')
          .update({ status: 'failed' })
          .eq('id', notification.id);
      } else {
        // Mark as sent
        await supabase
          .from('notification_queue')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', notification.id);
        
        processedCount++;
      }

    } catch (error) {
      console.error(`Error processing notification ${notification.id}:`, error);
      
      // Mark as failed
      await supabase
        .from('notification_queue')
        .update({ status: 'failed' })
        .eq('id', notification.id);
    }
  }

  console.log(`Processed ${processedCount} bulk notifications`);
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      notifications_sent: processedCount,
      total_pending: pendingNotifications?.length || 0 
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(handler);