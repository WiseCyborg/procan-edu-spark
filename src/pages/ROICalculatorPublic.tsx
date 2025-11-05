import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, TrendingUp, DollarSign, Users, Clock, Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BUSINESS_RULES } from "@/config/business-rules";
import { Badge } from "@/components/ui/badge";

type RetakeFrequency = 'never' | 'rare' | 'occasional' | 'frequent';

export default function ROICalculatorPublic() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState(15);
  const [currentPassRate, setCurrentPassRate] = useState(70);
  const [hourlyWage, setHourlyWage] = useState(20);
  const [retakeFrequency, setRetakeFrequency] = useState<RetakeFrequency>('occasional');

  const calculations = useMemo(() => {
    // Training cost (Maryland-compliant pricing)
    const trainingCost = agents * BUSINESS_RULES.SEAT_PRICE_USD;
    
    // Expected pass rate improvement
    const expectedPassRate = Math.min(currentPassRate + 18, 100);
    
    // Retakes prevented calculation
    const retakeRates = { never: 0, rare: 5, occasional: 15, frequent: 30 };
    const currentRetakeRate = retakeRates[retakeFrequency];
    const improvedRetakeRate = Math.max(currentRetakeRate - 12, 0);
    const retakesPrevented = agents * ((currentRetakeRate - improvedRetakeRate) / 100);
    
    // Cost savings
    const retakeCostPerAgent = 50; // Exam retake fee
    const timeWastedPerRetake = 4; // Hours
    const retakeCostSavings = retakesPrevented * (retakeCostPerAgent + (timeWastedPerRetake * hourlyWage));
    
    // Training time efficiency
    const avgTrainingTime = 5; // Hours
    const timeValueSavings = agents * avgTrainingTime * (hourlyWage * 0.2); // 20% efficiency gain
    
    // Total annual savings
    const annualSavings = Math.round(retakeCostSavings + timeValueSavings);
    
    // ROI
    const roi = ((annualSavings - trainingCost) / trainingCost) * 100;
    const paybackWeeks = Math.ceil((trainingCost / (annualSavings / 52)));
    
    return {
      trainingCost: Math.round(trainingCost),
      expectedPassRate: Math.round(expectedPassRate),
      retakesPrevented: Math.round(retakesPrevented * 10) / 10,
      annualSavings,
      roi: Math.round(roi),
      paybackWeeks,
      retakeCostSavings: Math.round(retakeCostSavings),
      timeValueSavings: Math.round(timeValueSavings)
    };
  }, [agents, currentPassRate, hourlyWage, retakeFrequency]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-accent/5 to-background py-16 px-4">
      <div className="container mx-auto max-w-5xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Brain className="h-4 w-4 mr-2" />
            AI-Powered ROI Calculator
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent">
            Calculate Your Dispensary's ROI
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            See exactly how much ProCann Edu can save your Maryland dispensary
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <Card className="shadow-xl">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-green-500/5">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Your Dispensary Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Number of Agents */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">Number of Agents</Label>
                  <Badge variant="outline" className="text-lg font-bold">{agents}</Badge>
                </div>
                <Slider
                  value={[agents]}
                  onValueChange={([v]) => setAgents(v)}
                  min={5}
                  max={100}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">Employees who need RVT certification</p>
              </div>

              {/* Current Pass Rate */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">Current Pass Rate</Label>
                  <Badge variant="outline" className="text-lg font-bold">{currentPassRate}%</Badge>
                </div>
                <Slider
                  value={[currentPassRate]}
                  onValueChange={([v]) => setCurrentPassRate(v)}
                  min={50}
                  max={100}
                  step={5}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">Estimate if unsure (Maryland avg: 78%)</p>
              </div>

              {/* Average Hourly Wage */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">Average Hourly Wage</Label>
                  <Badge variant="outline" className="text-lg font-bold">${hourlyWage}</Badge>
                </div>
                <Slider
                  value={[hourlyWage]}
                  onValueChange={([v]) => setHourlyWage(v)}
                  min={15}
                  max={50}
                  step={1}
                  className="mb-2"
                />
                <p className="text-xs text-muted-foreground">Used to calculate time-based savings</p>
              </div>

              {/* Retake Frequency */}
              <div>
                <Label className="text-base font-semibold mb-3 block">Retake Frequency</Label>
                <Select value={retakeFrequency} onValueChange={(v) => setRetakeFrequency(v as RetakeFrequency)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">Never (0% fail)</SelectItem>
                    <SelectItem value="rare">Rare (~5% fail)</SelectItem>
                    <SelectItem value="occasional">Occasional (~15% fail)</SelectItem>
                    <SelectItem value="frequent">Frequent (~30% fail)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2">How often do agents retake the exam?</p>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          <div className="space-y-6">
            <Card className="shadow-xl border-2 border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary to-green-600 text-white">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="h-6 w-6" />
                  Your ROI Projection
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {/* Investment */}
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Training Investment</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {agents} agents × ${BUSINESS_RULES.SEAT_PRICE_USD}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    ${calculations.trainingCost.toLocaleString()}
                  </div>
                </div>

                {/* Annual Savings */}
                <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <div>
                    <p className="text-sm font-semibold text-green-700 dark:text-green-400">Annual Savings</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Retakes + Time efficiency
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    ${calculations.annualSavings.toLocaleString()}
                  </div>
                </div>

                {/* ROI */}
                <div className="flex justify-between items-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div>
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">Return on Investment</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payback in {calculations.paybackWeeks} weeks
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-blue-600">
                    {calculations.roi}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Expected Improvements
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pass Rate Improvement</span>
                  <Badge className="bg-green-600">
                    {currentPassRate}% → {calculations.expectedPassRate}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Retakes Prevented (annually)</span>
                  <Badge variant="outline">{calculations.retakesPrevented} agents</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Retake Cost Savings</span>
                  <Badge variant="outline">${calculations.retakeCostSavings.toLocaleString()}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Time Efficiency Savings</span>
                  <Badge variant="outline">${calculations.timeValueSavings.toLocaleString()}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Button
              size="lg"
              onClick={() => navigate('/org/apply')}
              className="w-full shadow-lg text-lg h-14"
            >
              <DollarSign className="h-5 w-5 mr-2" />
              Get Your Free Compliance Audit
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Disclaimer */}
        <Card className="mt-8 bg-muted/30">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Maryland Pricing Compliance:</strong> ProCann Edu charges ${BUSINESS_RULES.SEAT_PRICE_USD} per employee, 
              maintaining compliance with Maryland's maximum charge of ${BUSINESS_RULES.MAX_ALLOWED_PRICE_MARYLAND.toFixed(2)} per employee. 
              Calculations based on industry averages and historical data from Maryland dispensaries.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
