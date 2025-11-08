import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifyAdminAccess(req: Request, supabase: any): Promise<Response | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
    );
  }

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .single();

  if (!userRole) {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Admin access required' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
    );
  }

  return null;
}

interface FixResult {
  fix: string;
  status: 'success' | 'error';
  message: string;
  details?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify admin access
    const authError = await verifyAdminAccess(req, supabase);
    if (authError) return authError;

    const results: FixResult[] = [];

    // Fix 1: Update course module count
    console.log('Fixing course module count...');
    const { error: courseError } = await supabase
      .from('courses')
      .update({ module_count: 23 })
      .eq('title', 'Maryland Responsible Vendor Training (RVT)');

    results.push({
      fix: 'course_module_count',
      status: courseError ? 'error' : 'success',
      message: courseError ? courseError.message : 'Updated course module count to 23',
    });

    // Fix 2: Generate 50 seats for Demo Dispensary LLC
    console.log('Generating seats for Demo Dispensary...');
    const { data: demoOrg } = await supabase
      .from('organizations')
      .select('id, course_credits')
      .eq('name', 'Demo Dispensary LLC')
      .single();

    if (demoOrg) {
      const { data: rvtCourse } = await supabase
        .from('courses')
        .select('id')
        .eq('title', 'Maryland Responsible Vendor Training (RVT)')
        .single();

      if (rvtCourse) {
        const seatsToCreate = Array.from({ length: 50 }, () => ({
          organization_id: demoOrg.id,
          course_id: rvtCourse.id,
          status: 'available',
          assigned_at: null,
          assigned_user_id: null,
        }));

        const { error: seatsError, data: seatsData } = await supabase
          .from('rvt_seats')
          .insert(seatsToCreate)
          .select();

        results.push({
          fix: 'demo_dispensary_seats',
          status: seatsError ? 'error' : 'success',
          message: seatsError ? seatsError.message : `Created ${seatsData?.length || 0} seats for Demo Dispensary LLC`,
          details: { seatsCreated: seatsData?.length || 0 },
        });
      } else {
        results.push({
          fix: 'demo_dispensary_seats',
          status: 'error',
          message: 'RVT course not found',
        });
      }
    } else {
      results.push({
        fix: 'demo_dispensary_seats',
        status: 'error',
        message: 'Demo Dispensary LLC not found',
      });
    }

    // Fix 3: Add all modules to COMAR review queue
    console.log('Adding modules to COMAR review queue...');
    const { data: modules } = await supabase
      .from('course_modules')
      .select('id, title, module_number')
      .eq('is_active', true)
      .is('last_comar_review_date', null);

    if (modules && modules.length > 0) {
      const reviewItems = modules.map(module => ({
        content_type: 'course_module',
        content_id: module.id,
        location: `Module ${module.module_number}: ${module.title}`,
        status: 'pending',
        urgency: 'high',
        ai_suggested_change: 'Initial COMAR compliance review required. Module has never been reviewed for regulatory compliance.',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }));

      const { error: queueError, data: queueData } = await supabase
        .from('content_review_queue')
        .insert(reviewItems)
        .select();

      results.push({
        fix: 'comar_review_queue',
        status: queueError ? 'error' : 'success',
        message: queueError ? queueError.message : `Added ${queueData?.length || 0} modules to COMAR review queue`,
        details: { modulesAdded: queueData?.length || 0 },
      });
    } else {
      results.push({
        fix: 'comar_review_queue',
        status: 'success',
        message: 'No modules need to be added to review queue',
        details: { modulesAdded: 0 },
      });
    }

    console.log('Database integrity fixes completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          successful: results.filter(r => r.status === 'success').length,
          failed: results.filter(r => r.status === 'error').length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Database integrity fix error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
