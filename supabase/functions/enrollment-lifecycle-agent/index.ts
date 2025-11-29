import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LearningJourney {
  id: string;
  user_id: string;
  organization_id: string | null;
  current_stage: string;
  stage_entered_at: string;
  last_activity_at: string;
  completion_percentage: number;
  modules_completed: number;
  interventions_sent: number;
  last_intervention_at: string | null;
  intervention_types: string[];
  at_risk_flag: boolean;
  profiles: {
    email_cache: string;
    first_name: string;
    last_name: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting enrollment lifecycle agent run...');
    
    const interventions = {
      profile_incomplete: 0,
      course_not_started: 0,
      course_stuck: 0,
      nearing_completion: 0,
      certificate_expiring: 0,
    };

    // Stage 1: Profile Completion (0-48 hours)
    const { data: incompleteProfiles } = await supabase
      .from('user_learning_journey')
      .select('*, profiles!inner(email_cache, first_name, last_name)')
      .eq('current_stage', 'profile_incomplete')
      .lt('stage_entered_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

    if (incompleteProfiles && incompleteProfiles.length > 0) {
      for (const journey of incompleteProfiles as LearningJourney[]) {
        const hoursSinceCreation = (Date.now() - new Date(journey.stage_entered_at).getTime()) / (1000 * 60 * 60);
        
        // Send reminders at 6h, 24h, 48h
        if (journey.interventions_sent < 3 && 
            (Math.abs(hoursSinceCreation - 6) < 1 || 
             Math.abs(hoursSinceCreation - 24) < 1 || 
             Math.abs(hoursSinceCreation - 48) < 1)) {
          
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: journey.profiles.email_cache,
              firstName: journey.profiles.first_name || 'there',
              reminderType: 'profile_completion',
              message: `Complete your profile to start your Maryland cannabis training journey!`,
            }
          });

          await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...journey.intervention_types, 'profile_reminder']
            })
            .eq('id', journey.id);

          interventions.profile_incomplete++;
        }
      }
    }

    // Stage 2: Course Not Started (Days 2-7)
    const { data: notStarted } = await supabase
      .from('user_learning_journey')
      .select('*, profiles!inner(email_cache, first_name, last_name)')
      .eq('current_stage', 'course_not_started')
      .gte('stage_entered_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lt('stage_entered_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

    if (notStarted && notStarted.length > 0) {
      for (const journey of notStarted as LearningJourney[]) {
        if (journey.interventions_sent < 2) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: journey.profiles.email_cache,
              firstName: journey.profiles.first_name || 'there',
              reminderType: 'course_start',
              message: `Ready to get started? Your Maryland COMAR certification is just a click away!`,
            }
          });

          await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...journey.intervention_types, 'course_start_reminder']
            })
            .eq('id', journey.id);

          interventions.course_not_started++;
        }
      }
    }

    // Stage 3: Detect Stuck Learners (No activity in 7+ days)
    const { data: inProgress } = await supabase
      .from('user_learning_journey')
      .select('*, profiles!inner(email_cache, first_name, last_name)')
      .eq('current_stage', 'course_in_progress')
      .lt('last_activity_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (inProgress && inProgress.length > 0) {
      for (const journey of inProgress as LearningJourney[]) {
        const daysSinceActivity = Math.floor((Date.now() - new Date(journey.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));
        
        // Mark as stuck and send encouragement
        await supabase.from('user_learning_journey')
          .update({
            current_stage: 'course_stuck',
            at_risk_flag: daysSinceActivity >= 14,
            risk_factors: { days_inactive: daysSinceActivity },
          })
          .eq('id', journey.id);

        if (journey.interventions_sent < 3) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: journey.profiles.email_cache,
              firstName: journey.profiles.first_name || 'there',
              reminderType: 'stuck_learner',
              message: `We noticed you haven't continued your training. Need help? Our Charm AI is here 24/7!`,
            }
          });

          await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...journey.intervention_types, 'stuck_encouragement']
            })
            .eq('id', journey.id);

          interventions.course_stuck++;
        }
      }
    }

    // Stage 4: Near Completion (80%+)
    const { data: nearingCompletion } = await supabase
      .from('user_learning_journey')
      .select('*, profiles!inner(email_cache, first_name, last_name)')
      .eq('current_stage', 'course_nearing_completion');

    if (nearingCompletion && nearingCompletion.length > 0) {
      for (const journey of nearingCompletion as LearningJourney[]) {
        if (journey.interventions_sent < 1) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: journey.profiles.email_cache,
              firstName: journey.profiles.first_name || 'there',
              reminderType: 'nearing_completion',
              message: `You're almost there! Just ${100 - journey.completion_percentage}% left to complete your certification!`,
            }
          });

          await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...journey.intervention_types, 'motivation_near_complete']
            })
            .eq('id', journey.id);

          interventions.nearing_completion++;
        }
      }
    }

    // Stage 5: Certificate Expiring (60, 30, 7 days)
    const { data: certificates } = await supabase
      .from('certificates')
      .select('*, profiles!inner(email_cache, first_name, last_name)')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', new Date().toISOString())
      .lte('expiry_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());

    if (certificates && certificates.length > 0) {
      for (const cert of certificates) {
        const daysUntilExpiry = Math.floor((new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        
        if ([60, 30, 7].includes(daysUntilExpiry)) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: cert.profiles.email_cache,
              firstName: cert.profiles.first_name || 'there',
              reminderType: 'certificate_renewal',
              message: `Your Maryland COMAR certificate expires in ${daysUntilExpiry} days. Renew now to stay compliant!`,
            }
          });

          // Update journey to renewal stage
          await supabase
            .from('user_learning_journey')
            .update({
              current_stage: 'certificate_expiring',
            })
            .eq('user_id', cert.user_id);

          interventions.certificate_expiring++;
        }
      }
    }

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'enrollment-lifecycle-agent',
      run_status: 'success',
      records_processed: Object.values(interventions).reduce((a, b) => a + b, 0),
      execution_metadata: interventions,
    });

    console.log('Lifecycle agent completed:', interventions);

    return new Response(
      JSON.stringify({ 
        success: true,
        interventions,
        totalSent: Object.values(interventions).reduce((a, b) => a + b, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lifecycle agent error:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
