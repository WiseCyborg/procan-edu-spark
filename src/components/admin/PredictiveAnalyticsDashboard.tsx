import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  DollarSign,
  Users,
  Target,
  Brain,
  MapPin,
  Shield,
  Sparkles
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { COMARBanner } from '@/components/layout/COMARBanner';

interface PredictiveMetric {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'neutral';
  confidence: number;
  forecast: number[];
}

interface RiskAssessment {
  organization: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: string[];
  recommended_action: string;
}

interface RevenueProjection {
  month: string;
  actual?: number;
  forecast: number;
  confidence_range: [number, number];
}

export const PredictiveAnalyticsDashboard = () => {
  const [metrics, setMetrics] = useState<PredictiveMetric[]>([]);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>([]);
  const [revenueProjections, setRevenueProjections] = useState<RevenueProjection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPredictiveData();
  }, []);

  const fetchPredictiveData = async () => {
    setLoading(true);
    
    // Simulated predictive data - in production, this would call edge functions
    setTimeout(() => {
      setMetrics([
        {
          label: 'Course Completion Rate',
          value: 78,
          trend: 'up',
          confidence: 0.92,
          forecast: [75, 76, 77, 78, 79, 81, 82]
        },
        {
          label: 'Revenue Growth (Next Quarter)',
          value: 23,
          trend: 'up',
          confidence: 0.85,
          forecast: [18, 19, 21, 23, 24, 25, 26]
        },
        {
          label: 'Student Churn Risk',
          value: 8,
          trend: 'down',
          confidence: 0.88,
          forecast: [12, 11, 10, 8, 7, 6, 5]
        },
        {
          label: 'ROI from AI Optimizations',
          value: 340,
          trend: 'up',
          confidence: 0.90,
          forecast: [200, 240, 280, 340, 380, 420, 460]
        }
      ]);

      setRiskAssessments([
        {
          organization: 'Green Leaf Dispensary',
          risk_level: 'high',
          factors: ['3 students overdue', 'Low engagement scores', 'Certificate expiring soon'],
          recommended_action: 'Schedule intervention call with training coordinator'
        },
        {
          organization: 'Capital Cannabis Co.',
          risk_level: 'medium',
          factors: ['2 failed exam attempts', 'Module completion at 65%'],
          recommended_action: 'Offer remedial training modules'
        },
        {
          organization: 'Harbor Health & Wellness',
          risk_level: 'low',
          factors: ['On track', '95% completion rate'],
          recommended_action: 'Continue monitoring'
        }
      ]);

      setRevenueProjections([
        { month: 'Jan', actual: 45000, forecast: 45000, confidence_range: [43000, 47000] },
        { month: 'Feb', actual: 48000, forecast: 48000, confidence_range: [46000, 50000] },
        { month: 'Mar', actual: 52000, forecast: 52000, confidence_range: [49000, 55000] },
        { month: 'Apr', forecast: 58000, confidence_range: [54000, 62000] },
        { month: 'May', forecast: 63000, confidence_range: [58000, 68000] },
        { month: 'Jun', forecast: 67000, confidence_range: [62000, 72000] },
      ]);

      setLoading(false);
    }, 1000);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />;
  };

  const getRiskColor = (level: string) => {
    switch(level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading predictive analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Maryland RVT Intelligence Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            AI-powered insights for sustainable cannabis education
          </p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Brain className="h-4 w-4" />
          AI-Powered Insights
        </Badge>
      </div>

      <COMARBanner />

      {/* Key Predictive Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
              {getTrendIcon(metric.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metric.value}
                {metric.label.includes('Rate') || metric.label.includes('Growth') ? '%' : ''}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.confidence * 100}% confidence
              </p>
              <Progress value={metric.confidence * 100} className="mt-2 h-1" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Forecasting</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Organization Risk Assessment</CardTitle>
              <CardDescription>
                Predictive analysis of training completion risks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {riskAssessments.map((assessment, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg">
                  <AlertTriangle className={`h-5 w-5 mt-1 ${
                    assessment.risk_level === 'high' || assessment.risk_level === 'critical'
                      ? 'text-red-600'
                      : assessment.risk_level === 'medium'
                      ? 'text-yellow-600'
                      : 'text-green-600'
                  }`} />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{assessment.organization}</h4>
                      <Badge variant={getRiskColor(assessment.risk_level)}>
                        {assessment.risk_level.toUpperCase()}
                      </Badge>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {assessment.factors.map((factor, i) => (
                        <li key={i}>• {factor}</li>
                      ))}
                    </ul>
                    <div className="flex items-center gap-2 pt-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{assessment.recommended_action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth Forecast</CardTitle>
              <CardDescription>
                6-month projection based on historical trends and market analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={revenueProjections}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => `$${value.toLocaleString()}`}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="actual" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))"
                    fillOpacity={0.6}
                    name="Actual Revenue"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="forecast" 
                    stroke="hsl(var(--chart-2))" 
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.3}
                    strokeDasharray="5 5"
                    name="Forecasted Revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Expected Q2 Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">$188K</p>
                    <p className="text-xs text-muted-foreground">+23% vs Q1</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Growth Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">15.3%</p>
                    <p className="text-xs text-muted-foreground">Monthly average</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Confidence Level
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">85%</p>
                    <p className="text-xs text-muted-foreground">High reliability</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Business Insights</CardTitle>
              <CardDescription>
                Strategic recommendations for sustainable growth
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950 rounded">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  High-Impact Opportunity Detected
                </h4>
                <p className="text-sm text-muted-foreground">
                  Baltimore County dispensaries show 18% higher engagement with interactive COMAR modules. 
                  Expanding this format to all Maryland counties could increase completion rates by 12-15% 
                  and generate an estimated <strong>$18,000 in additional annual revenue</strong> through 
                  reduced retake costs.
                </p>
              </div>

              <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950 rounded">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Maryland Market Intelligence
                </h4>
                <p className="text-sm text-muted-foreground">
                  MCA license renewals peak in Q3. Historical data suggests a <strong>40% surge in training demand</strong> 
                  starting June. Recommend proactive outreach to 23 dispensaries with expiring certifications.
                </p>
              </div>

              <div className="p-4 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-950 rounded">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Predictive Risk Alert
                </h4>
                <p className="text-sm text-muted-foreground">
                  5 students are predicted to fail the final exam (72% confidence) based on Module 12-14 
                  quiz performance. Early intervention now could prevent <strong>$250 in retake costs</strong> and 
                  improve student satisfaction scores.
                </p>
              </div>

              <div className="p-4 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950 rounded">
                <h4 className="font-semibold flex items-center gap-2 mb-2">
                  <Brain className="h-5 w-5 text-purple-600" />
                  COMAR Compliance Optimization
                </h4>
                <p className="text-sm text-muted-foreground">
                  Recent COMAR 14.17.05.02(A)(3) updates detected. <strong>7 course modules</strong> flagged 
                  for review. AI-suggested content updates predict <strong>95% MCA audit readiness</strong> if 
                  implemented within 14 days.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
