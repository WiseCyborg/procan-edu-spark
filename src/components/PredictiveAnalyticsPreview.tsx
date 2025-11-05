import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Brain, TrendingUp, Clock, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BUSINESS_RULES } from "@/config/business-rules";

type DispensarySize = 'small' | 'medium' | 'large';

export const PredictiveAnalyticsPreview = () => {
  const [dispensarySize, setDispensarySize] = useState<DispensarySize>('medium');
  const navigate = useNavigate();

  const calculations = useMemo(() => {
    const agentCounts = { small: 7, medium: 15, large: 30 };
    const agents = agentCounts[dispensarySize];
    const trainingCost = agents * BUSINESS_RULES.SEAT_PRICE_USD;
    const annualSavings = agents * 800; // Estimated per agent
    const roi = ((annualSavings - trainingCost) / trainingCost) * 100;
    const paybackWeeks = Math.ceil((trainingCost / (annualSavings / 52)));

    return { 
      agents, 
      trainingCost: Math.round(trainingCost), 
      annualSavings, 
      roi: Math.round(roi), 
      paybackWeeks 
    };
  }, [dispensarySize]);

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-primary/5 via-accent/10 to-green-500/5">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-10 w-10 text-primary" />
            <h3 className="text-3xl md:text-4xl font-bold">
              See Your ROI Before You Buy
            </h3>
          </div>
          <p className="text-lg text-muted-foreground">
            Try our AI-powered ROI calculator - no signup required
          </p>
        </div>

        <Card className="shadow-2xl border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-green-500/5">
            <CardTitle className="text-center text-xl">Interactive ROI Demo</CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            {/* Dispensary Size Selector */}
            <div className="mb-8">
              <Label className="text-base font-semibold mb-3 block">
                Select Your Dispensary Size:
              </Label>
              <Select value={dispensarySize} onValueChange={(v) => setDispensarySize(v as DispensarySize)}>
                <SelectTrigger className="w-full text-lg h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (5-10 agents)</SelectItem>
                  <SelectItem value="medium">Medium (11-25 agents)</SelectItem>
                  <SelectItem value="large">Large (26+ agents)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-green-700 dark:text-green-300">
                    ${calculations.trainingCost.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Training Investment</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-300">
                    ${calculations.annualSavings.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Annual Savings</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardContent className="p-4 text-center">
                  <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-300">
                    {calculations.roi}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">ROI</div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
                <CardContent className="p-4 text-center">
                  <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-orange-700 dark:text-orange-300">
                    {calculations.paybackWeeks}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Weeks to Payback</div>
                </CardContent>
              </Card>
            </div>

            {/* Calculation Breakdown */}
            <div className="bg-muted/30 rounded-lg p-4 mb-6 text-sm text-muted-foreground">
              <p className="font-semibold mb-2">How we calculated this:</p>
              <ul className="space-y-1">
                <li>• {calculations.agents} agents × ${BUSINESS_RULES.SEAT_PRICE_USD} = ${calculations.trainingCost} training cost</li>
                <li>• Average savings per agent: $800/year (reduced retakes, faster training, better compliance)</li>
                <li>• ROI: ({calculations.annualSavings.toLocaleString()} - {calculations.trainingCost.toLocaleString()}) ÷ {calculations.trainingCost.toLocaleString()} × 100</li>
              </ul>
            </div>

            {/* CTA */}
            <div className="text-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/roi-calculator-public')}
                className="w-full md:w-auto shadow-lg"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Get YOUR Actual ROI Analysis
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
