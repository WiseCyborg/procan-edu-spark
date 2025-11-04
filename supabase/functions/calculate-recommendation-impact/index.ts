import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImpactRequest {
  recommendationId: string;
  baselineStart: string;
  baselineEnd: string;
  measurementStart: string;
  measurementEnd?: string;
  implementationDate: string;
  hoursSpent?: number;
  costPerRetake?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      recommendationId,
      baselineStart,
      baselineEnd,
      measurementStart,
      measurementEnd,
      implementationDate,
      hoursSpent = 0,
      costPerRetake = 50
    }: ImpactRequest = await req.json();

    console.log('Calculating impact for recommendation:', recommendationId);

    // Calculate baseline metrics (before implementation)
    const { data: baselineAttempts, error: baselineError } = await supabase
      .from('exam_attempts')
      .select('id, user_id, is_passed, total_score, attempt_number')
      .gte('created_at', baselineStart)
      .lte('created_at', baselineEnd);

    if (baselineError) throw baselineError;

    // Calculate post-implementation metrics
    const measurementEndDate = measurementEnd || new Date().toISOString();
    const { data: postAttempts, error: postError } = await supabase
      .from('exam_attempts')
      .select('id, user_id, is_passed, total_score, attempt_number')
      .gte('created_at', measurementStart)
      .lte('created_at', measurementEndDate);

    if (postError) throw postError;

    // Calculate baseline metrics
    const baselinePassRate = baselineAttempts.length > 0
      ? (baselineAttempts.filter(a => a.is_passed).length / baselineAttempts.length) * 100
      : 0;
    
    const baselineAvgScore = baselineAttempts.length > 0
      ? baselineAttempts.reduce((sum, a) => sum + (a.total_score || 0), 0) / baselineAttempts.length
      : 0;

    // Calculate average attempts per user (baseline)
    const baselineUserAttempts = baselineAttempts.reduce((acc, a) => {
      acc[a.user_id] = (acc[a.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const baselineAvgAttempts = Object.keys(baselineUserAttempts).length > 0
      ? Object.values(baselineUserAttempts).reduce((sum, count) => sum + count, 0) / Object.keys(baselineUserAttempts).length
      : 0;

    // Calculate post-implementation metrics
    const postPassRate = postAttempts.length > 0
      ? (postAttempts.filter(a => a.is_passed).length / postAttempts.length) * 100
      : 0;
    
    const postAvgScore = postAttempts.length > 0
      ? postAttempts.reduce((sum, a) => sum + (a.total_score || 0), 0) / postAttempts.length
      : 0;

    // Calculate average attempts per user (post)
    const postUserAttempts = postAttempts.reduce((acc, a) => {
      acc[a.user_id] = (acc[a.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const postAvgAttempts = Object.keys(postUserAttempts).length > 0
      ? Object.values(postUserAttempts).reduce((sum, count) => sum + count, 0) / Object.keys(postUserAttempts).length
      : 0;

    // Calculate improvements
    const improvementPassRate = postPassRate - baselinePassRate;
    const improvementAvgScore = postAvgScore - baselineAvgScore;
    const reductionRetakeRate = ((baselineAvgAttempts - postAvgAttempts) / baselineAvgAttempts) * 100;

    // Calculate ROI metrics
    const totalUniqueUsers = Math.max(
      Object.keys(baselineUserAttempts).length,
      Object.keys(postUserAttempts).length
    );
    
    // Estimate retakes prevented (if avg attempts decreased)
    const retakesPrevented = Math.max(0, Math.floor(
      (baselineAvgAttempts - postAvgAttempts) * totalUniqueUsers
    ));

    // Annual projections (assume measurement period is representative)
    const measurementDays = (new Date(measurementEndDate).getTime() - new Date(measurementStart).getTime()) / (1000 * 60 * 60 * 24);
    const annualMultiplier = 365 / Math.max(measurementDays, 1);
    const retakesPreventedAnnually = Math.floor(retakesPrevented * annualMultiplier);
    
    // Calculate annual savings
    const annualSavings = retakesPreventedAnnually * costPerRetake;
    
    // Estimate hours saved (30 min per retake prevented)
    const hoursPerRetake = 0.5;
    const hoursSavedAnnually = retakesPreventedAnnually * hoursPerRetake;

    // Calculate ROI percentage
    const implementationCost = hoursSpent * 50; // Assume $50/hour implementation cost
    const roiPercentage = implementationCost > 0
      ? ((annualSavings - implementationCost) / implementationCost) * 100
      : 0;

    // Create or update impact tracking record
    const impactData = {
      recommendation_id: recommendationId,
      implementation_date: implementationDate,
      baseline_period_start: baselineStart,
      baseline_period_end: baselineEnd,
      measurement_period_start: measurementStart,
      measurement_period_end: measurementEndDate,
      baseline_pass_rate: Math.round(baselinePassRate * 100) / 100,
      baseline_avg_score: Math.round(baselineAvgScore * 100) / 100,
      baseline_avg_attempts: Math.round(baselineAvgAttempts * 100) / 100,
      baseline_sample_size: baselineAttempts.length,
      post_pass_rate: Math.round(postPassRate * 100) / 100,
      post_avg_score: Math.round(postAvgScore * 100) / 100,
      post_avg_attempts: Math.round(postAvgAttempts * 100) / 100,
      post_sample_size: postAttempts.length,
      improvement_pass_rate: Math.round(improvementPassRate * 100) / 100,
      improvement_avg_score: Math.round(improvementAvgScore * 100) / 100,
      reduction_retake_rate: Math.round(reductionRetakeRate * 100) / 100,
      hours_spent_implementing: hoursSpent,
      estimated_hours_saved_annually: Math.round(hoursSavedAnnually * 100) / 100,
      estimated_cost_per_retake: costPerRetake,
      retakes_prevented_annually: retakesPreventedAnnually,
      annual_savings_usd: Math.round(annualSavings * 100) / 100,
      roi_percentage: Math.round(roiPercentage * 100) / 100,
    };

    const { data: impactRecord, error: impactError } = await supabase
      .from('recommendation_impact_tracking')
      .upsert(impactData)
      .select()
      .single();

    if (impactError) throw impactError;

    // Update recommendation with impact summary
    const { error: updateError } = await supabase
      .from('curriculum_recommendations')
      .update({
        tracked_impact: true,
        implementation_date: implementationDate,
        impact_summary: {
          pass_rate_improvement: improvementPassRate,
          score_improvement: improvementAvgScore,
          roi_percentage: roiPercentage,
          annual_savings: annualSavings,
        }
      })
      .eq('id', recommendationId);

    if (updateError) throw updateError;

    console.log('Impact calculated successfully:', impactRecord.id);

    return new Response(
      JSON.stringify({
        success: true,
        impact: impactRecord,
        message: 'Impact calculated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating impact:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});