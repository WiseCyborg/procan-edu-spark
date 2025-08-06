import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Target, 
  Brain,
  LineChart,
  BarChart3,
  Activity,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface PredictiveMetric {
  id: string;
  name: string;
  current_value: number;
  predicted_value: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
  impact: 'high' | 'medium' | 'low';
  category: 'completion' | 'revenue' | 'compliance' | 'engagement';
}

interface RiskAssessment {
  organization_id: string;
  organization_name: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: string[];
  recommendations: string[];
  compliance_status: number;
  completion_rate: number;
  expiring_certificates: number;
}

interface RevenueProjection {
  month: string;
  actual_revenue: number;
  projected_revenue: number;
  confidence_interval: [number, number];
  growth_rate: number;
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
    try {
      // Simulate predictive analytics data
      const mockMetrics: PredictiveMetric[] = [
        {
          id: '1',
          name: 'Course Completion Rate',
          current_value: 78,
          predicted_value: 85,
          confidence: 89,
          trend: 'up',
          impact: 'high',
          category: 'completion'
        },
        {
          id: '2',
          name: 'Revenue Growth',
          current_value: 12.5,
          predicted_value: 18.3,
          confidence: 76,
          trend: 'up',
          impact: 'high',
          category: 'revenue'
        },
        {
          id: '3',
          name: 'Compliance Risk',
          current_value: 15,
          predicted_value: 8,
          confidence: 82,
          trend: 'down',
          impact: 'medium',
          category: 'compliance'
        },
        {
          id: '4',
          name: 'User Engagement',
          current_value: 68,
          predicted_value: 73,
          confidence: 71,
          trend: 'up',
          impact: 'medium',
          category: 'engagement'
        }
      ];

      const mockRiskAssessments: RiskAssessment[] = [
        {
          organization_id: '1',
          organization_name: 'Green Valley Dispensary',
          risk_score: 85,
          risk_level: 'high',
          factors: ['Low completion rate (45%)', '12 expiring certificates', 'Overdue payments'],
          recommendations: ['Send immediate reminders', 'Schedule training sessions', 'Contact for payment'],
          compliance_status: 45,
          completion_rate: 45,
          expiring_certificates: 12
        },
        {
          organization_id: '2',
          organization_name: 'Cannabis Care Collective',
          risk_score: 35,
          risk_level: 'medium',
          factors: ['3 expiring certificates', 'Average engagement'],
          recommendations: ['Monitor closely', 'Send renewal reminders'],
          compliance_status: 78,
          completion_rate: 78,
          expiring_certificates: 3
        },
        {
          organization_id: '3',
          organization_name: 'Herbal Wellness Center',
          risk_score: 15,
          risk_level: 'low',
          factors: ['High completion rate', 'Up-to-date certificates'],
          recommendations: ['Maintain current practices'],
          compliance_status: 95,
          completion_rate: 95,
          expiring_certificates: 0
        }
      ];

      const mockRevenueProjections: RevenueProjection[] = [
        { month: 'Jan 2025', actual_revenue: 25000, projected_revenue: 28000, confidence_interval: [26000, 30000], growth_rate: 12 },
        { month: 'Feb 2025', actual_revenue: 0, projected_revenue: 31000, confidence_interval: [29000, 33000], growth_rate: 11 },
        { month: 'Mar 2025', actual_revenue: 0, projected_revenue: 34000, confidence_interval: [32000, 36000], growth_rate: 10 },
        { month: 'Apr 2025', actual_revenue: 0, projected_revenue: 37000, confidence_interval: [35000, 39000], growth_rate: 9 },
        { month: 'May 2025', actual_revenue: 0, projected_revenue: 40000, confidence_interval: [38000, 42000], growth_rate: 8 },
        { month: 'Jun 2025', actual_revenue: 0, projected_revenue: 43000, confidence_interval: [41000, 45000], growth_rate: 7.5 }
      ];

      setMetrics(mockMetrics);
      setRiskAssessments(mockRiskAssessments);
      setRevenueProjections(mockRevenueProjections);
    } catch (error) {
      console.error('Error fetching predictive data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'completion': return <Target className="h-4 w-4" />;
      case 'revenue': return <DollarSign className="h-4 w-4" />;
      case 'compliance': return <AlertTriangle className="h-4 w-4" />;
      case 'engagement': return <Users className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading predictive analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground flex items-center">
          <Brain className="h-6 w-6 mr-2" />
          Predictive Analytics Dashboard
        </h2>
        <Badge className="bg-primary text-primary-foreground">
          AI-Powered Insights
        </Badge>
      </div>

      {/* Key Predictive Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(metric => (
          <Card key={metric.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  {getCategoryIcon(metric.category)}
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                {getTrendIcon(metric.trend)}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">{metric.current_value}</span>
                  <span className="text-lg text-muted-foreground">→ {metric.predicted_value}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{metric.confidence}%</span>
                </div>
                <Progress value={metric.confidence} className="h-1" />
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Impact</span>
                  <Badge variant="outline" className={getImpactColor(metric.impact)}>
                    {metric.impact}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="risk" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Forecasting</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Organization Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskAssessments.map(assessment => (
                  <div key={assessment.organization_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{assessment.organization_name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Risk Score: {assessment.risk_score}/100
                        </p>
                      </div>
                      <Badge className={`${getRiskColor(assessment.risk_level)} px-3 py-1`}>
                        {assessment.risk_level.toUpperCase()} RISK
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Compliance Status</span>
                          <span className="text-sm font-medium">{assessment.compliance_status}%</span>
                        </div>
                        <Progress value={assessment.compliance_status} className="h-2" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Completion Rate</span>
                          <span className="text-sm font-medium">{assessment.completion_rate}%</span>
                        </div>
                        <Progress value={assessment.completion_rate} className="h-2" />
                      </div>
                      
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">{assessment.expiring_certificates}</p>
                        <p className="text-sm text-muted-foreground">Expiring Certificates</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2 text-red-700">Risk Factors</h4>
                        <ul className="text-sm space-y-1">
                          {assessment.factors.map((factor, index) => (
                            <li key={index} className="flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-2 text-red-500" />
                              {factor}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2 text-blue-700">Recommendations</h4>
                        <ul className="text-sm space-y-1">
                          {assessment.recommendations.map((rec, index) => (
                            <li key={index} className="flex items-center">
                              <Target className="h-3 w-3 mr-2 text-blue-500" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2" />
                Revenue Forecasting
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <DollarSign className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <h3 className="font-semibold">Projected Growth</h3>
                      <p className="text-2xl font-bold text-green-600">+72%</p>
                      <p className="text-sm text-muted-foreground">Next 6 months</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h3 className="font-semibold">Best Month</h3>
                      <p className="text-2xl font-bold text-blue-600">June</p>
                      <p className="text-sm text-muted-foreground">$43,000 projected</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <Activity className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <h3 className="font-semibold">Confidence</h3>
                      <p className="text-2xl font-bold text-purple-600">87%</p>
                      <p className="text-sm text-muted-foreground">Prediction accuracy</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Monthly Revenue Projections</h4>
                  {revenueProjections.map((projection, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{projection.month}</span>
                        <div className="flex items-center space-x-4">
                          {projection.actual_revenue > 0 && (
                            <span className="text-sm text-muted-foreground">
                              Actual: ${projection.actual_revenue.toLocaleString()}
                            </span>
                          )}
                          <span className="font-semibold">
                            Projected: ${projection.projected_revenue.toLocaleString()}
                          </span>
                          <Badge variant={projection.growth_rate > 10 ? "default" : "secondary"}>
                            +{projection.growth_rate}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          Range: ${projection.confidence_interval[0].toLocaleString()} - ${projection.confidence_interval[1].toLocaleString()}
                        </span>
                        <span>Growth: +{projection.growth_rate}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                AI-Generated Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold text-blue-700 mb-2">Completion Rate Optimization</h4>
                  <p className="text-sm text-muted-foreground">
                    Analysis shows that sending reminders 3 days before module deadlines increases completion rates by 23%. 
                    Organizations with manager check-ins have 31% higher completion rates.
                  </p>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold text-green-700 mb-2">Revenue Opportunity</h4>
                  <p className="text-sm text-muted-foreground">
                    Implementing tiered pricing for organizations with 50+ employees could increase revenue by $15,000/month. 
                    Consider offering bulk discounts to encourage larger enrollments.
                  </p>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold text-orange-700 mb-2">Compliance Risk Alert</h4>
                  <p className="text-sm text-muted-foreground">
                    3 organizations are at high risk of compliance violations due to certificate expirations. 
                    Immediate intervention recommended to prevent regulatory issues.
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold text-purple-700 mb-2">Engagement Pattern</h4>
                  <p className="text-sm text-muted-foreground">
                    Users who complete modules within 7 days of enrollment have 45% higher final exam scores. 
                    Consider implementing early engagement incentives.
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-semibold text-red-700 mb-2">Churn Prevention</h4>
                  <p className="text-sm text-muted-foreground">
                    Organizations that haven't logged in for 14+ days have 67% probability of churning. 
                    Automated re-engagement campaigns could reduce churn by 28%.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};