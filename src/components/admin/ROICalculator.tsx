import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRecommendationImpact } from '@/hooks/useRecommendationImpact';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, DollarSign, Clock, Target, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { animateValue, formatCurrency, formatNumber } from '@/utils/animationHelpers';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const ROICalculator = () => {
  const [selectedRecommendation, setSelectedRecommendation] = useState<string>('');
  const [baselineStart, setBaselineStart] = useState('');
  const [baselineEnd, setBaselineEnd] = useState('');
  const [measurementStart, setMeasurementStart] = useState('');
  const [measurementEnd, setMeasurementEnd] = useState('');
  const [implementationDate, setImplementationDate] = useState('');
  const [hoursSpent, setHoursSpent] = useState('8');
  const [costPerRetake, setCostPerRetake] = useState('50');

  const { impact, calculateImpact, aggregateROI } = useRecommendationImpact(selectedRecommendation);

  // Fetch completed recommendations
  const { data: recommendations, isLoading: loadingRecs } = useQuery({
    queryKey: ['completed-recommendations'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('curriculum_recommendations')
        .select('*')
        .in('status', ['completed', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Auto-set dates when recommendation is selected
  useEffect(() => {
    if (selectedRecommendation && !impact) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      setBaselineStart(ninetyDaysAgo.toISOString().split('T')[0]);
      setBaselineEnd(sixtyDaysAgo.toISOString().split('T')[0]);
      setMeasurementStart(sixtyDaysAgo.toISOString().split('T')[0]);
      setMeasurementEnd(now.toISOString().split('T')[0]);
      setImplementationDate(sixtyDaysAgo.toISOString().split('T')[0]);
    } else if (impact) {
      setBaselineStart(impact.baseline_period_start.split('T')[0]);
      setBaselineEnd(impact.baseline_period_end.split('T')[0]);
      setMeasurementStart(impact.measurement_period_start.split('T')[0]);
      setMeasurementEnd(impact.measurement_period_end?.split('T')[0] || '');
      setImplementationDate(impact.implementation_date.split('T')[0]);
      setHoursSpent(impact.hours_spent_implementing?.toString() || '8');
      setCostPerRetake(impact.estimated_cost_per_retake?.toString() || '50');
    }
  }, [selectedRecommendation, impact]);

  const handleCalculate = () => {
    if (!selectedRecommendation || !baselineStart || !baselineEnd || !measurementStart || !implementationDate) {
      return;
    }

    calculateImpact.mutate({
      recommendationId: selectedRecommendation,
      baselineStart: new Date(baselineStart).toISOString(),
      baselineEnd: new Date(baselineEnd).toISOString(),
      measurementStart: new Date(measurementStart).toISOString(),
      measurementEnd: measurementEnd ? new Date(measurementEnd).toISOString() : undefined,
      implementationDate: new Date(implementationDate).toISOString(),
      hoursSpent: parseFloat(hoursSpent) || 0,
      costPerRetake: parseFloat(costPerRetake) || 50,
    });
  };

  const MetricCard = ({ title, value, icon: Icon, trend, color = 'default' }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend >= 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
            )}
            <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const comparisonData = impact ? [
    {
      name: 'Pass Rate',
      Before: impact.baseline_pass_rate,
      After: impact.post_pass_rate,
    },
    {
      name: 'Avg Score',
      Before: impact.baseline_avg_score,
      After: impact.post_avg_score,
    },
    {
      name: 'Avg Attempts',
      Before: impact.baseline_avg_attempts,
      After: impact.post_avg_attempts,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Aggregate ROI Summary */}
      {aggregateROI && aggregateROI.count > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Cumulative ROI Across All Recommendations
            </CardTitle>
            <CardDescription>
              Total impact from {aggregateROI.count} implemented recommendation{aggregateROI.count !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(aggregateROI.totalSavings)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Annual Savings</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-3xl font-bold text-blue-600">
                  {formatNumber(Math.round(aggregateROI.totalHoursSaved))}h
                </div>
                <div className="text-sm text-muted-foreground mt-1">Hours Saved/Year</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-3xl font-bold text-purple-600">
                  +{aggregateROI.avgPassRateImprovement.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">Avg Pass Rate ↑</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-3xl font-bold text-orange-600">
                  +{aggregateROI.avgScoreImprovement.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Avg Score ↑</div>
              </div>
              <div className="text-center p-4 bg-background rounded-lg">
                <div className="text-3xl font-bold text-teal-600">
                  {formatNumber(aggregateROI.totalRetakesPrevented)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Retakes Prevented</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Section */}
      <Card>
        <CardHeader>
          <CardTitle>Calculate Recommendation Impact</CardTitle>
          <CardDescription>
            Select a completed recommendation and configure time periods to measure ROI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Recommendation</Label>
              <Select value={selectedRecommendation} onValueChange={setSelectedRecommendation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select recommendation" />
                </SelectTrigger>
                <SelectContent>
                  {loadingRecs ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    recommendations?.map((rec: any) => (
                      <SelectItem key={rec.id} value={rec.id}>
                        {rec.title} ({rec.status})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Implementation Date</Label>
              <Input
                type="date"
                value={implementationDate}
                onChange={(e) => setImplementationDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Baseline Period Start</Label>
              <Input
                type="date"
                value={baselineStart}
                onChange={(e) => setBaselineStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Baseline Period End</Label>
              <Input
                type="date"
                value={baselineEnd}
                onChange={(e) => setBaselineEnd(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Measurement Period Start</Label>
              <Input
                type="date"
                value={measurementStart}
                onChange={(e) => setMeasurementStart(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Measurement Period End (optional)</Label>
              <Input
                type="date"
                value={measurementEnd}
                onChange={(e) => setMeasurementEnd(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hours Spent Implementing</Label>
              <Input
                type="number"
                value={hoursSpent}
                onChange={(e) => setHoursSpent(e.target.value)}
                placeholder="8"
              />
            </div>

            <div className="space-y-2">
              <Label>Cost Per Retake ($)</Label>
              <Input
                type="number"
                value={costPerRetake}
                onChange={(e) => setCostPerRetake(e.target.value)}
                placeholder="50"
              />
            </div>
          </div>

          <Button
            onClick={handleCalculate}
            disabled={!selectedRecommendation || calculateImpact.isPending}
            className="w-full"
          >
            {calculateImpact.isPending ? 'Calculating...' : 'Calculate ROI'}
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      {impact && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MetricCard
              title="Annual Savings"
              value={formatCurrency(impact.annual_savings_usd)}
              icon={DollarSign}
              color="green-600"
            />
            <MetricCard
              title="Hours Saved/Year"
              value={`${formatNumber(Math.round(impact.estimated_hours_saved_annually))}h`}
              icon={Clock}
              color="blue-600"
            />
            <MetricCard
              title="ROI"
              value={`${impact.roi_percentage.toFixed(0)}%`}
              icon={TrendingUp}
              trend={impact.roi_percentage}
              color="purple-600"
            />
            <MetricCard
              title="Pass Rate Improvement"
              value={`+${impact.improvement_pass_rate.toFixed(1)}%`}
              icon={Target}
              trend={impact.improvement_pass_rate}
              color="orange-600"
            />
            <MetricCard
              title="Score Improvement"
              value={`+${impact.improvement_avg_score.toFixed(1)}`}
              icon={Award}
              trend={impact.improvement_avg_score}
              color="teal-600"
            />
            <MetricCard
              title="Retakes Prevented/Year"
              value={formatNumber(impact.retakes_prevented_annually)}
              icon={TrendingDown}
              color="indigo-600"
            />
          </div>

          {/* Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Before & After Comparison</CardTitle>
              <CardDescription>
                Baseline: {new Date(impact.baseline_period_start).toLocaleDateString()} - {new Date(impact.baseline_period_end).toLocaleDateString()} 
                {' | '}
                Post: {new Date(impact.measurement_period_start).toLocaleDateString()} - {impact.measurement_period_end ? new Date(impact.measurement_period_end).toLocaleDateString() : 'Now'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Before" fill="hsl(var(--muted))" />
                  <Bar dataKey="After" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Sample Sizes */}
          <Card>
            <CardHeader>
              <CardTitle>Data Confidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Baseline Sample Size</div>
                  <div className="text-2xl font-bold">{impact.baseline_sample_size} attempts</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Post-Implementation Sample Size</div>
                  <div className="text-2xl font-bold">{impact.post_sample_size} attempts</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};