import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, Lightbulb, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';

interface ROIIntelligenceAgentProps {
  roi: number;
  currentPassRate: number;
  agents: number;
  annualSavings: number;
  trainingCost: number;
  retakeFrequency: string;
  hourlyWage: number;
  onOptimize?: () => void;
}

export const ROIIntelligenceAgent = ({
  roi,
  currentPassRate,
  agents,
  annualSavings,
  trainingCost,
  retakeFrequency,
  hourlyWage,
  onOptimize
}: ROIIntelligenceAgentProps) => {
  const MARYLAND_AVG_PASS_RATE = 78;
  const PROCANN_TARGET_PASS_RATE = 88;

  const analysis = useMemo(() => {
    const isPositiveROI = roi > 0;
    const belowMarylandAvg = currentPassRate < MARYLAND_AVG_PASS_RATE;
    const lowRetakeFreq = retakeFrequency === 'never' || retakeFrequency === 'rare';
    
    // Calculate what pass rate improvement would make ROI positive
    const breakEvenSavingsNeeded = trainingCost;
    const currentSavingsPerPoint = annualSavings / 18; // Assuming 18% improvement baseline
    const additionalSavingsNeeded = breakEvenSavingsNeeded - annualSavings;
    const passRatePointsNeeded = Math.ceil(additionalSavingsNeeded / (currentSavingsPerPoint || 1));
    
    // Generate contextual insights
    const insights: string[] = [];
    const optimizations: { action: string; impact: string; }[] = [];

    if (!isPositiveROI) {
      if (belowMarylandAvg) {
        insights.push(`Your current pass rate (${currentPassRate}%) is below the Maryland average (${MARYLAND_AVG_PASS_RATE}%). This is your biggest opportunity for improvement.`);
        optimizations.push({
          action: `Improve pass rate to ${PROCANN_TARGET_PASS_RATE}%`,
          impact: 'ProCann Edu customers typically achieve 88%+ pass rates, which would significantly boost your ROI'
        });
      }
      
      if (lowRetakeFreq) {
        insights.push(`With low retake frequency, your savings from prevented retakes are minimal. The real value comes from time efficiency and compliance assurance.`);
        optimizations.push({
          action: 'Factor in compliance risk reduction',
          impact: 'MCA audits can cost $5,000+ in fines. Proper training prevents costly violations.'
        });
      }

      if (agents < 20) {
        insights.push(`With ${agents} agents, your per-employee investment is optimal, but total savings are limited by team size.`);
        optimizations.push({
          action: 'Consider annual recertification value',
          impact: 'Each certified employee maintains compliance year-round, preventing operational disruptions.'
        });
      }
    } else {
      insights.push(`Your projected ROI is positive! This means the investment pays for itself within the first year.`);
      
      if (currentPassRate < PROCANN_TARGET_PASS_RATE) {
        optimizations.push({
          action: `Push pass rate toward ${PROCANN_TARGET_PASS_RATE}%`,
          impact: `Could increase annual savings by $${Math.round(currentSavingsPerPoint * (PROCANN_TARGET_PASS_RATE - currentPassRate))} more`
        });
      }
    }

    // Data confidence note
    const confidence = agents >= 15 ? 'high' : agents >= 10 ? 'moderate' : 'low';

    return {
      isPositiveROI,
      insights,
      optimizations,
      confidence,
      mainMessage: isPositiveROI 
        ? `Great news! Your training investment will generate ${roi}% return in the first year.`
        : `Your ROI appears negative (${roi}%), but here's how to turn it positive:`
    };
  }, [roi, currentPassRate, agents, annualSavings, trainingCost, retakeFrequency]);

  return (
    <Card className={`border-2 ${analysis.isPositiveROI ? 'border-green-500/30 bg-green-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <CardContent className="p-4 space-y-4">
        {/* Agent Header */}
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-full ${analysis.isPositiveROI ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
            <Brain className={`h-5 w-5 ${analysis.isPositiveROI ? 'text-green-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <p className="font-semibold text-sm">ROI Intelligence Agent</p>
            <Badge variant="outline" className="text-xs">
              {analysis.confidence} confidence • Based on Maryland dispensary data
            </Badge>
          </div>
        </div>

        {/* Main Message */}
        <div className={`p-3 rounded-lg ${analysis.isPositiveROI ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
          <p className="text-sm font-medium flex items-start gap-2">
            {analysis.isPositiveROI ? (
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            )}
            {analysis.mainMessage}
          </p>
        </div>

        {/* Insights */}
        {analysis.insights.length > 0 && (
          <div className="space-y-2">
            {analysis.insights.map((insight, i) => (
              <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {insight}
              </p>
            ))}
          </div>
        )}

        {/* Optimization Suggestions */}
        {analysis.optimizations.length > 0 && !analysis.isPositiveROI && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              How to improve your ROI
            </p>
            {analysis.optimizations.map((opt, i) => (
              <div key={i} className="text-sm bg-background/50 p-2 rounded">
                <p className="font-medium text-primary">{opt.action}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.impact}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA for negative ROI */}
        {!analysis.isPositiveROI && onOptimize && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onOptimize}
            className="w-full mt-2"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Show me how to make this positive
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
