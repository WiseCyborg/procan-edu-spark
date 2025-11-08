import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrityIssue {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  count: number;
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

    const issues: IntegrityIssue[] = [];

    // Check 1: Users without roles
    const { count: usersWithoutRoles } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'in', '(SELECT user_id FROM user_roles)');

    if (usersWithoutRoles && usersWithoutRoles > 0) {
      issues.push({
        category: 'user_management',
        severity: 'high',
        issue: 'Users without roles',
        count: usersWithoutRoles,
      });
    }

    // Check 2: Courses without modules
    const { data: coursesWithoutModules } = await supabase
      .from('courses')
      .select('id, title')
      .not('id', 'in', '(SELECT DISTINCT course_id FROM course_modules WHERE is_active = true)');

    if (coursesWithoutModules && coursesWithoutModules.length > 0) {
      issues.push({
        category: 'course_content',
        severity: 'critical',
        issue: 'Courses without active modules',
        count: coursesWithoutModules.length,
        details: coursesWithoutModules,
      });
    }

    // Check 3: Certificates without exam attempts
    const { count: certsWithoutExams } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .not('exam_attempt_id', 'in', '(SELECT id FROM exam_attempts)');

    if (certsWithoutExams && certsWithoutExams > 0) {
      issues.push({
        category: 'certification',
        severity: 'high',
        issue: 'Certificates without corresponding exam attempts',
        count: certsWithoutExams,
      });
    }

    // Check 4: Seats assigned to wrong organizations
    const { data: mismatchedSeats } = await supabase
      .rpc('check_seat_organization_mismatch');

    if (mismatchedSeats && mismatchedSeats.length > 0) {
      issues.push({
        category: 'seat_management',
        severity: 'high',
        issue: 'Seats assigned to users from different organizations',
        count: mismatchedSeats.length,
        details: mismatchedSeats,
      });
    }

    // Check 5: Modules without COMAR review
    const { count: unreviewed } = await supabase
      .from('course_modules')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .is('last_comar_review_date', null);

    if (unreviewed && unreviewed > 0) {
      issues.push({
        category: 'compliance',
        severity: 'critical',
        issue: 'Course modules never reviewed for COMAR compliance',
        count: unreviewed,
      });
    }

    // Check 6: Failed email delivery
    const { count: failedEmails } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (failedEmails && failedEmails > 0) {
      issues.push({
        category: 'email_delivery',
        severity: 'high',
        issue: 'Failed email deliveries in last 24 hours',
        count: failedEmails,
      });
    }

    // Check 7: Organizations with credits but no seats
    const { data: orgsWithoutSeats } = await supabase
      .from('organizations')
      .select('id, name, course_credits')
      .gt('course_credits', 0)
      .not('id', 'in', '(SELECT DISTINCT organization_id FROM rvt_seats)');

    if (orgsWithoutSeats && orgsWithoutSeats.length > 0) {
      issues.push({
        category: 'seat_management',
        severity: 'high',
        issue: 'Organizations with course credits but no seats created',
        count: orgsWithoutSeats.length,
        details: orgsWithoutSeats,
      });
    }

    // Check 8: Course module count mismatches
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, module_count');

    if (courses) {
      for (const course of courses) {
        const { count: actualModules } = await supabase
          .from('course_modules')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('is_active', true);

        if (actualModules !== course.module_count) {
          issues.push({
            category: 'course_content',
            severity: 'medium',
            issue: `Course "${course.title}" module count mismatch`,
            count: 1,
            details: {
              expected: course.module_count,
              actual: actualModules,
            },
          });
        }
      }
    }

    const summary = {
      totalIssues: issues.length,
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
      healthScore: Math.max(0, 100 - (issues.length * 5)),
    };

    console.log('Database integrity check completed:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary,
        issues,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Database integrity check error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
