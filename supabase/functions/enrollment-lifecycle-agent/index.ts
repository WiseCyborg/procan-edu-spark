import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProfileLite {
  user_id: string;
  email_cache: string | null;
  first_name: string | null;
  last_name: string | null;
}

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
}

// PostgREST cannot embed `profiles` from `user_learning_journey` or `certificates`
// (no foreign key between those tables and public.profiles), which returned HTTP 400.
// Fetch profiles explicitly in a second step and index them by user_id instead.
async function fetchProfileMap(
  supabase: any,
  rows: any[],
  errors: string[],
): Promise<Map<string, ProfileLite>> {
  const map = new Map<string, ProfileLite>();
  if (!rows || rows.length === 0) return map;
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
  if (userIds.length === 0) return map;

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, email_cache, first_name, last_name')
    .in('user_id', userIds);

  if (error) {
    console.error('[enrollment-lifecycle-agent] profiles lookup failed:', error.message, error);
    errors.push(`profiles lookup: ${error.message}`);
    return map;
  }

  for (const p of (profiles || []) as ProfileLite[]) {
    map.set(p.user_id, p);
  }
  return map;
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
    const startTime = Date.now();

    const interventions = {
      profile_incomplete: 0,
      course_not_started: 0,
      course_stuck: 0,
      nearing_completion: 0,
      certificate_expiring: 0,
    };

    const errors: string[] = [];
    let stagesAttempted = 0;
    let stagesSucceeded = 0;
    let skippedMissingProfile = 0;

    const JOURNEY_COLUMNS =
      'id, user_id, organization_id, current_stage, stage_entered_at, last_activity_at, completion_percentage, modules_completed, interventions_sent, last_intervention_at, intervention_types, at_risk_flag';

    // Stage 1: Profile Completion (0-48 hours)
    stagesAttempted++;
    const { data: incompleteProfiles, error: incompleteError } = await supabase
      .from('user_learning_journey')
      .select(JOURNEY_COLUMNS)
      .eq('current_stage', 'profile_incomplete')
      .lt('stage_entered_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

    if (incompleteError) {
      console.error('[enrollment-lifecycle-agent] stage profile_incomplete query failed:', incompleteError.message, incompleteError);
      errors.push(`profile_incomplete: ${incompleteError.message}`);
    } else {
      stagesSucceeded++;
      const profileMap = await fetchProfileMap(supabase, incompleteProfiles || [], errors);
      for (const journey of (incompleteProfiles || []) as LearningJourney[]) {
        const profile = profileMap.get(journey.user_id);
        if (!profile || !profile.email_cache) {
          skippedMissingProfile++;
          continue;
        }

        const hoursSinceCreation = (Date.now() - new Date(journey.stage_entered_at).getTime()) / (1000 * 60 * 60);

        // Send reminders at 6h, 24h, 48h
        if (journey.interventions_sent < 3 &&
            (Math.abs(hoursSinceCreation - 6) < 1 ||
             Math.abs(hoursSinceCreation - 24) < 1 ||
             Math.abs(hoursSinceCreation - 48) < 1)) {

          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: profile.email_cache,
              firstName: profile.first_name || 'there',
              reminderType: 'profile_completion',
              message: `Complete your profile to start your Maryland cannabis training journey!`,
            }
          });

          const { error: updateError } = await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...(journey.intervention_types || []), 'profile_reminder']
            })
            .eq('id', journey.id);

          if (updateError) {
            console.error('[enrollment-lifecycle-agent] profile_incomplete journey update failed:', updateError.message, updateError);
            errors.push(`profile_incomplete update: ${updateError.message}`);
          }

          interventions.profile_incomplete++;
        }
      }
    }

    // Stage 2: Course Not Started (Days 2-7)
    stagesAttempted++;
    const { data: notStarted, error: notStartedError } = await supabase
      .from('user_learning_journey')
      .select(JOURNEY_COLUMNS)
      .eq('current_stage', 'course_not_started')
      .gte('stage_entered_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .lt('stage_entered_at', new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString());

    if (notStartedError) {
      console.error('[enrollment-lifecycle-agent] stage course_not_started query failed:', notStartedError.message, notStartedError);
      errors.push(`course_not_started: ${notStartedError.message}`);
    } else {
      stagesSucceeded++;
      const profileMap = await fetchProfileMap(supabase, notStarted || [], errors);
      for (const journey of (notStarted || []) as LearningJourney[]) {
        const profile = profileMap.get(journey.user_id);
        if (!profile || !profile.email_cache) {
          skippedMissingProfile++;
          continue;
        }

        if (journey.interventions_sent < 2) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: profile.email_cache,
              firstName: profile.first_name || 'there',
              reminderType: 'course_start',
              message: `Ready to get started? Your Maryland COMAR certification is just a click away!`,
            }
          });

          const { error: updateError } = await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...(journey.intervention_types || []), 'course_start_reminder']
            })
            .eq('id', journey.id);

          if (updateError) {
            console.error('[enrollment-lifecycle-agent] course_not_started journey update failed:', updateError.message, updateError);
            errors.push(`course_not_started update: ${updateError.message}`);
          }

          interventions.course_not_started++;
        }
      }
    }

    // Stage 3: Detect Stuck Learners (No activity in 7+ days)
    stagesAttempted++;
    const { data: inProgress, error: inProgressError } = await supabase
      .from('user_learning_journey')
      .select(JOURNEY_COLUMNS)
      .eq('current_stage', 'course_in_progress')
      .lt('last_activity_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (inProgressError) {
      console.error('[enrollment-lifecycle-agent] stage course_in_progress query failed:', inProgressError.message, inProgressError);
      errors.push(`course_in_progress: ${inProgressError.message}`);
    } else {
      stagesSucceeded++;
      const profileMap = await fetchProfileMap(supabase, inProgress || [], errors);
      for (const journey of (inProgress || []) as LearningJourney[]) {
        const profile = profileMap.get(journey.user_id);
        if (!profile || !profile.email_cache) {
          skippedMissingProfile++;
          continue;
        }

        const daysSinceActivity = Math.floor((Date.now() - new Date(journey.last_activity_at).getTime()) / (1000 * 60 * 60 * 24));

        // Mark as stuck and send encouragement
        const { error: stuckError } = await supabase.from('user_learning_journey')
          .update({
            current_stage: 'course_stuck',
            at_risk_flag: daysSinceActivity >= 14,
            risk_factors: { days_inactive: daysSinceActivity },
          })
          .eq('id', journey.id);

        if (stuckError) {
          console.error('[enrollment-lifecycle-agent] course_stuck stage update failed:', stuckError.message, stuckError);
          errors.push(`course_stuck update: ${stuckError.message}`);
        }

        if (journey.interventions_sent < 3) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: profile.email_cache,
              firstName: profile.first_name || 'there',
              reminderType: 'stuck_learner',
              message: `We noticed you haven't continued your training. Need help? Our Charm AI is here 24/7!`,
            }
          });

          const { error: updateError } = await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...(journey.intervention_types || []), 'stuck_encouragement']
            })
            .eq('id', journey.id);

          if (updateError) {
            console.error('[enrollment-lifecycle-agent] stuck journey update failed:', updateError.message, updateError);
            errors.push(`course_stuck intervention update: ${updateError.message}`);
          }

          interventions.course_stuck++;
        }
      }
    }

    // Stage 4: Near Completion (80%+)
    stagesAttempted++;
    const { data: nearingCompletion, error: nearingError } = await supabase
      .from('user_learning_journey')
      .select(JOURNEY_COLUMNS)
      .eq('current_stage', 'course_nearing_completion');

    if (nearingError) {
      console.error('[enrollment-lifecycle-agent] stage course_nearing_completion query failed:', nearingError.message, nearingError);
      errors.push(`course_nearing_completion: ${nearingError.message}`);
    } else {
      stagesSucceeded++;
      const profileMap = await fetchProfileMap(supabase, nearingCompletion || [], errors);
      for (const journey of (nearingCompletion || []) as LearningJourney[]) {
        const profile = profileMap.get(journey.user_id);
        if (!profile || !profile.email_cache) {
          skippedMissingProfile++;
          continue;
        }

        if (journey.interventions_sent < 1) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: profile.email_cache,
              firstName: profile.first_name || 'there',
              reminderType: 'nearing_completion',
              message: `You're almost there! Just ${100 - journey.completion_percentage}% left to complete your certification!`,
            }
          });

          const { error: updateError } = await supabase.from('user_learning_journey')
            .update({
              interventions_sent: journey.interventions_sent + 1,
              last_intervention_at: new Date().toISOString(),
              intervention_types: [...(journey.intervention_types || []), 'motivation_near_complete']
            })
            .eq('id', journey.id);

          if (updateError) {
            console.error('[enrollment-lifecycle-agent] nearing_completion journey update failed:', updateError.message, updateError);
            errors.push(`course_nearing_completion update: ${updateError.message}`);
          }

          interventions.nearing_completion++;
        }
      }
    }

    // Stage 5: Certificate Expiring (60, 30, 7 days)
    stagesAttempted++;
    const { data: certificates, error: certificatesError } = await supabase
      .from('certificates')
      .select('*')
      .not('expiry_date', 'is', null)
      .gte('expiry_date', new Date().toISOString())
      .lte('expiry_date', new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString());

    if (certificatesError) {
      console.error('[enrollment-lifecycle-agent] certificates query failed:', certificatesError.message, certificatesError);
      errors.push(`certificate_expiring: ${certificatesError.message}`);
    } else {
      stagesSucceeded++;
      const profileMap = await fetchProfileMap(supabase, certificates || [], errors);
      for (const cert of (certificates || []) as any[]) {
        const profile = profileMap.get(cert.user_id);
        if (!profile || !profile.email_cache) {
          skippedMissingProfile++;
          continue;
        }

        const daysUntilExpiry = Math.floor((new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        if ([60, 30, 7].includes(daysUntilExpiry)) {
          await supabase.functions.invoke('send-welcome-email', {
            body: {
              email: profile.email_cache,
              firstName: profile.first_name || 'there',
              reminderType: 'certificate_renewal',
              message: `Your Maryland COMAR certificate expires in ${daysUntilExpiry} days. Renew now to stay compliant!`,
            }
          });

          // Update journey to renewal stage
          const { error: journeyError } = await supabase
            .from('user_learning_journey')
            .update({
              current_stage: 'certificate_expiring',
            })
            .eq('user_id', cert.user_id);

          if (journeyError) {
            console.error('[enrollment-lifecycle-agent] certificate_expiring journey update failed:', journeyError.message, journeyError);
            errors.push(`certificate_expiring update: ${journeyError.message}`);
          }

          interventions.certificate_expiring++;
        }
      }
    }

    const runStatus = errors.length === 0
      ? 'success'
      : (stagesSucceeded > 0 ? 'partial' : 'failed');

    // Log agent run
    await supabase.from('ai_agent_runs').insert({
      agent_name: 'enrollment-lifecycle-agent',
      run_status: runStatus,
      records_processed: Object.values(interventions).reduce((a, b) => a + b, 0),
      execution_metadata: {
        ...interventions,
        skipped_missing_profile: skippedMissingProfile,
        stages_attempted: stagesAttempted,
        stages_succeeded: stagesSucceeded,
        errors,
      },
    });

    console.log('Lifecycle agent completed:', { runStatus, interventions, errors, skippedMissingProfile });

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
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
