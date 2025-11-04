import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ROIForecastInput {
  recommendationId: string;
  proposedImplementationDate?: string;
}

interface ROIForecastOutput {
  predicted_roi_percentage: number;
  confidence_interval: [number, number];
  expected_pass_rate_improvement: number;
  payback_period_months: number;
  risk_factors: string[];
  comparable_past_implementations: string[];
  model_version: string;
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

    const { recommendationId, proposedImplementationDate } = await req.json() as ROIForecastInput;

    if (!recommendationId) {
      throw new Error('recommendationId is required');
    }

    console.log(`📊 Forecasting ROI for recommendation: ${recommendationId}`);

    // Get recommendation details
    const { data: recommendation, error: recError } = await supabase
      .from('curriculum_recommendations')
      .select('*')
      .eq('id', recommendationId)
      .single();

    if (recError || !recommendation) {
      throw new Error('Recommendation not found');
    }

    // Get historical impact data from similar recommendations
    const { data: historicalImpacts } = await supabase
      .from('recommendation_impact_tracking')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get exam analytics for related sections
    const relatedSections = recommendation.related_sections || [];
    const { data: topicAnalytics } = await supabase
      .from('exam_topic_analytics')
      .select('*')
      .in('section_number', relatedSections);

    // Calculate baseline metrics
    let baselinePassRate = 75; // default
    let topicDifficulty = 0.5; // default medium
    
    if (topicAnalytics && topicAnalytics.length > 0) {
      baselinePassRate = topicAnalytics.reduce((sum, topic) => 
        sum + (topic.pass_rate || 0), 0) / topicAnalytics.length;
      
      // Difficulty based on failure rate
      const avgFailRate = topicAnalytics.reduce((sum, topic) => 
        sum + ((100 - (topic.pass_rate || 75)) / 100), 0) / topicAnalytics.length;
      topicDifficulty = avgFailRate;
    }

    // Calculate prediction based on historical patterns
    let predictedImprovementFactor = 1.15; // default 15% improvement
    const riskFactors: string[] = [];

    if (historicalImpacts && historicalImpacts.length > 0) {
      // Filter similar priority and category
      const similarImpacts = historicalImpacts.filter(impact => 
        impact.improvement_pass_rate && impact.improvement_pass_rate > 0
      );

      if (similarImpacts.length > 0) {
        const avgImprovement = similarImpacts.reduce((sum, impact) => 
          sum + (impact.improvement_pass_rate || 0), 0) / similarImpacts.length;
        predictedImprovementFactor = 1 + (avgImprovement / 100);
      }
    }

    // Adjust for difficulty
    if (topicDifficulty > 0.3) {
      predictedImprovementFactor *= 1.1; // Higher potential for difficult topics
      riskFactors.push('High baseline difficulty - potential for significant improvement');
    }

    // Adjust for priority
    if (recommendation.priority === 'critical' || recommendation.priority === 'high') {
      predictedImprovementFactor *= 1.05;
    }

    // Calculate forecasted metrics
    const predictedPassRate = Math.min(baselinePassRate * predictedImprovementFactor, 98);
    const passRateImprovement = predictedPassRate - baselinePassRate;

    // Estimate financial impact
    const avgStudentsPerYear = 500; // estimate
    const currentRetakeRate = (100 - baselinePassRate) / 100;
    const predictedRetakeRate = (100 - predictedPassRate) / 100;
    const retakesPrevented = Math.round(avgStudentsPerYear * (currentRetakeRate - predictedRetakeRate));
    const annualSavings = retakesPrevented * 50; // $50 per retake

    // Implementation cost estimate
    const effortHoursMap: { [key: string]: number } = {
      'low': 5,
      'medium': 15,
      'high': 40,
    };
    const implementationHours = effortHoursMap[recommendation.estimated_effort || 'medium'];
    const implementationCost = implementationHours * 75; // $75/hour

    // Calculate ROI
    const roiPercentage = implementationCost > 0 
      ? ((annualSavings - implementationCost) / implementationCost) * 100
      : 0;

    // Calculate payback period in months
    const monthlySavings = annualSavings / 12;
    const paybackMonths = monthlySavings > 0 
      ? Math.ceil(implementationCost / monthlySavings)
      : 12;

    // Confidence interval (simplified - in production use proper statistical methods)
    const confidenceMargin = 0.15; // ±15%
    const confidenceInterval: [number, number] = [
      Math.max(0, roiPercentage * (1 - confidenceMargin)),
      roiPercentage * (1 + confidenceMargin)
    ];

    // Risk factors
    if (baselinePassRate < 60) {
      riskFactors.push('Very low baseline - high variability expected');
    }
    if (implementationHours > 30) {
      riskFactors.push('High implementation effort - ensure adequate resources');
    }
    if (historicalImpacts && historicalImpacts.length < 3) {
      riskFactors.push('Limited historical data - prediction uncertainty is high');
    }

    // Find comparable implementations
    const comparableIds = (historicalImpacts || [])
      .slice(0, 3)
      .map(impact => impact.recommendation_id);

    const forecast: ROIForecastOutput = {
      predicted_roi_percentage: Math.round(roiPercentage * 100) / 100,
      confidence_interval: [
        Math.round(confidenceInterval[0] * 100) / 100,
        Math.round(confidenceInterval[1] * 100) / 100
      ],
      expected_pass_rate_improvement: Math.round(passRateImprovement * 100) / 100,
      payback_period_months: paybackMonths,
      risk_factors: riskFactors,
      comparable_past_implementations: comparableIds,
      model_version: 'v1.0-statistical'
    };

    // Store forecast
    await supabase
      .from('roi_forecasts')
      .insert({
        recommendation_id: recommendationId,
        predicted_roi_percentage: forecast.predicted_roi_percentage,
        confidence_interval_lower: forecast.confidence_interval[0],
        confidence_interval_upper: forecast.confidence_interval[1],
        expected_pass_rate_improvement: forecast.expected_pass_rate_improvement,
        payback_period_months: forecast.payback_period_months,
        risk_factors: forecast.risk_factors,
        comparable_implementations: forecast.comparable_past_implementations,
        model_version: forecast.model_version,
      });

    console.log(`✅ Forecast complete: ROI ${forecast.predicted_roi_percentage}%`);

    return new Response(
      JSON.stringify({
        success: true,
        forecast,
        recommendation: {
          id: recommendation.id,
          title: recommendation.title,
          priority: recommendation.priority,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ROI forecasting:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
