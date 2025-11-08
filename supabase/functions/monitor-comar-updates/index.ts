import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface COMARChange {
  section_reference: string;
  change_detected: boolean;
  change_summary?: string;
  effective_date?: string;
  content?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT and check admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin role
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    if (!roles?.some(r => r.role === 'admin')) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Starting COMAR monitoring check...');

    // Maryland COMAR sections we care about
    const monitoredSections = [
      'COMAR 14.17.05', // RVT regulations
      'COMAR 21.11.08.03', // Drug-Free Workplace
    ];

    const changes: COMARChange[] = [];

    // TODO: In production, this would scrape Maryland Register
    // For now, we'll check our regulatory_updates table for recent changes
    const { data: recentUpdates, error: updatesError } = await supabase
      .from('regulatory_updates')
      .select('*')
      .gte('detected_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('detected_at', { ascending: false });

    if (updatesError) {
      console.error('Error fetching regulatory updates:', updatesError);
    }

    // Check for COMAR version updates
    for (const section of monitoredSections) {
      const { data: currentVersion, error: versionError } = await supabase
        .from('comar_versions')
        .select('*')
        .eq('section_reference', section)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();

      if (versionError && versionError.code !== 'PGRST116') {
        console.error(`Error checking ${section}:`, versionError);
        continue;
      }

      // Check if any recent updates affect this section
      const relevantUpdates = recentUpdates?.filter(update => 
        update.section_number?.includes(section.replace('COMAR ', ''))
      ) || [];

      if (relevantUpdates.length > 0) {
        console.log(`📢 Found ${relevantUpdates.length} updates for ${section}`);
        
        for (const update of relevantUpdates) {
          changes.push({
            section_reference: section,
            change_detected: true,
            change_summary: update.ai_summary || 'Regulatory change detected',
            effective_date: update.detected_at,
          });

          // Flag affected modules for review
          if (update.affected_modules && Array.isArray(update.affected_modules)) {
            const { data: affectedModules } = await supabase
              .from('course_modules')
              .select('id, title')
              .or(
                update.affected_modules
                  .map((mod: string) => `title.ilike.%${mod}%`)
                  .join(',')
              );

            if (affectedModules && affectedModules.length > 0) {
              console.log(`⚠️ Flagging ${affectedModules.length} modules for review`);
              
              await supabase
                .from('course_modules')
                .update({ 
                  comar_compliance_status: 'needs_review',
                  last_comar_review_date: new Date().toISOString()
                })
                .in('id', affectedModules.map(m => m.id));

              // Create content review tasks
              const reviewTasks = affectedModules.map(module => ({
                content_type: 'course_module',
                content_id: module.id,
                location: `Module: ${module.title}`,
                urgency: update.urgency || 'medium',
                status: 'pending',
                ai_suggested_change: `Review for COMAR ${section} compliance based on recent regulatory update`,
                regulatory_update_id: update.id,
                due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
              }));

              await supabase
                .from('content_review_queue')
                .insert(reviewTasks);
            }
          }
        }
      }
    }

    // Alert admin if critical changes detected
    const criticalChanges = changes.filter(c => c.change_detected);
    if (criticalChanges.length > 0) {
      console.log(`🚨 ${criticalChanges.length} critical COMAR changes detected`);
      
      await supabase.functions.invoke('queue_job', {
        body: {
          job_type: 'admin_alert',
          payload: {
            alert_type: 'comar_changes_detected',
            changes: criticalChanges,
            timestamp: new Date().toISOString(),
          },
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        changes_detected: changes.length,
        changes: changes,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in COMAR monitoring:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
