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

    const { section_number, old_hash, new_hash, change_summary, change_impact } = await req.json();

    console.log(`Processing regulatory change for section ${section_number}`);

    // Find all students who were certified under the old version
    const { data: affectedStudents, error: studentsError } = await supabase
      .from('student_certification_versions')
      .select(`
        id,
        user_id,
        module_id,
        course_modules!inner(module_number, title)
      `)
      .eq('comar_version_hash', old_hash)
      .eq('requires_update', false);

    if (studentsError) throw studentsError;

    console.log(`Found ${affectedStudents?.length || 0} affected students`);

    let notificationsCreated = 0;
    const requiresRecert = change_impact === 'major' || change_impact === 'critical';

    // Create notifications for affected students
    for (const student of affectedStudents || []) {
      // Create notification
      const { error: notifError } = await supabase
        .from('regulatory_change_notifications')
        .insert({
          user_id: student.user_id,
          comar_section: section_number,
          change_type: 'modified',
          change_summary: change_summary || 'Regulatory content has been updated',
          requires_recertification: requiresRecert,
          notification_sent_at: new Date().toISOString()
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
        continue;
      }

      // Mark certification version as requiring update
      const { error: updateError } = await supabase
        .from('student_certification_versions')
        .update({
          requires_update: true,
          update_reason: `COMAR section ${section_number} was updated (${change_impact} impact)`
        })
        .eq('id', student.id);

      if (updateError) {
        console.error('Error updating certification version:', updateError);
        continue;
      }

      notificationsCreated++;

      // If critical change, send email notification
      if (requiresRecert) {
        try {
          await supabase.functions.invoke('send-email', {
            body: {
              to: student.user_id,
              subject: 'Important: Maryland Cannabis Regulations Updated',
              template: 'regulatory_update',
              data: {
                section_number,
                change_summary,
                module_title: student.course_modules?.title,
                requires_recertification: true
              }
            }
          });
        } catch (emailError) {
          console.error('Error sending email:', emailError);
        }
      }
    }

    console.log(`Created ${notificationsCreated} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        affected_students: affectedStudents?.length || 0,
        notifications_created: notificationsCreated,
        requires_recertification: requiresRecert
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in notify-regulatory-changes:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
