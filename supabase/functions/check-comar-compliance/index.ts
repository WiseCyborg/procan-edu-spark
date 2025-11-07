import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting COMAR compliance check...');

    // Get modules needing review
    const { data: modulesNeedingReview, error: modulesError } = await supabase
      .rpc('get_modules_needing_review');

    if (modulesError) {
      console.error('Error fetching modules needing review:', modulesError);
      throw modulesError;
    }

    console.log(`Found ${modulesNeedingReview?.length || 0} modules needing review`);

    if (!modulesNeedingReview || modulesNeedingReview.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          modules_checked: 0,
          reviews_created: 0,
          message: 'All modules are up to date'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let reviewsCreated = 0;
    const adminEmails: string[] = [];

    // Get admin users for notifications
    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(user_id, first_name, last_name)')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        const { data: authUser } = await supabase.auth.admin.getUserById(admin.user_id);
        if (authUser?.user?.email) {
          adminEmails.push(authUser.user.email);
        }
      }
    }

    // Create review queue items for overdue modules
    for (const module of modulesNeedingReview) {
      const daysSinceReview = module.last_reviewed_at 
        ? Math.floor((Date.now() - new Date(module.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const urgency = module.days_overdue > 30 ? 'critical' : 
                      module.days_overdue > 14 ? 'high' : 'medium';

      // Check if review item already exists
      const { data: existingReview } = await supabase
        .from('content_review_queue')
        .select('id')
        .eq('content_type', 'course_module')
        .eq('content_id', module.module_id)
        .eq('status', 'pending')
        .single();

      if (!existingReview) {
        const { error: queueError } = await supabase
          .from('content_review_queue')
          .insert({
            content_type: 'course_module',
            content_id: module.module_id,
            content_location: `Module ${module.module_number}: ${module.module_title}`,
            urgency: urgency,
            ai_suggestions: `6-month compliance review ${module.days_overdue > 0 ? 'OVERDUE' : 'DUE'}. Last reviewed ${daysSinceReview} days ago. Verify alignment with latest COMAR 14.17 regulations. Reference: ${module.comar_reference}`,
            status: 'pending'
          });

        if (!queueError) {
          reviewsCreated++;
          console.log(`Created review for Module ${module.module_number}`);
        }
      }
    }

    // Send notification to admins if there are overdue modules
    if (reviewsCreated > 0 && adminEmails.length > 0) {
      const criticalCount = modulesNeedingReview.filter(m => m.days_overdue > 30).length;
      const highCount = modulesNeedingReview.filter(m => m.days_overdue > 14 && m.days_overdue <= 30).length;

      for (const email of adminEmails) {
        await supabase.from('notification_queue').insert({
          recipient_email: email,
          subject: `COMAR Compliance Review Required: ${reviewsCreated} Modules`,
          message: `The automated compliance monitoring system has identified ${reviewsCreated} course modules that require 6-month COMAR review:\n\n` +
                   `• ${criticalCount} CRITICAL (>30 days overdue)\n` +
                   `• ${highCount} HIGH priority (>14 days overdue)\n` +
                   `• ${reviewsCreated - criticalCount - highCount} MEDIUM priority\n\n` +
                   `Please review these modules in the Content Review Dashboard to ensure continued regulatory compliance.`,
          scheduled_for: new Date().toISOString(),
          priority: criticalCount > 0 ? 'high' : 'medium'
        });
      }
    }

    // Log the check
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'COMAR Compliance Monitor',
      agent_type: 'compliance_checker',
      execution_status: 'success',
      items_processed: modulesNeedingReview.length,
      actions_taken: [`Created ${reviewsCreated} review queue items`, `Notified ${adminEmails.length} admins`],
      metadata: { 
        modules_checked: modulesNeedingReview.length,
        reviews_created: reviewsCreated,
        admin_notifications: adminEmails.length
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        modules_checked: modulesNeedingReview.length,
        reviews_created: reviewsCreated,
        notifications_sent: adminEmails.length,
        overdue_modules: modulesNeedingReview
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-comar-compliance:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
