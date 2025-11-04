import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, TrendingUp, AlertTriangle, CheckCircle, 
  Calendar, Users, DollarSign, Trophy, Loader2, Target
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const RVTIntelligence = () => {
  const { data: complianceStatus, isLoading: loadingCompliance } = useQuery({
    queryKey: ['rvt-compliance-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rvt_compliance_tracking' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: competitorData, isLoading: loadingCompetitors } = useQuery({
    queryKey: ['competitor-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_snapshots' as any)
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: renewalTracking, isLoading: loadingRenewal } = useQuery({
    queryKey: ['rvt-renewal-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rvt_renewal_tracking' as any)
        .select('*')
        .order('risk_level');
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: recommendations, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['curriculum-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_recommendations' as any)
        .select('*')
        .eq('status', 'pending')
        .order('priority', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as any[];
    },
  });

  const alignedCount = complianceStatus?.filter((c: any) => c.our_curriculum_aligned).length || 0;
  const totalCompliance = complianceStatus?.length || 1;
  const alignmentPercentage = (alignedCount / totalCompliance) * 100;

  const renewalStats = {
    total: renewalTracking?.length || 0,
    critical: renewalTracking?.filter((r: any) => r.risk_level === 'critical').length || 0,
    high: renewalTracking?.filter((r: any) => r.risk_level === 'high').length || 0,
    onTrack: renewalTracking?.filter((r: any) => r.risk_level === 'low').length || 0,
  };

  if (loadingCompliance || loadingCompetitors || loadingRenewal || loadingRecommendations) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            RVT Intelligence Dashboard
          </h1>
          <p className="text-muted-foreground">
            Responsible Vendor Training compliance & competitive intelligence
          </p>
        </div>
        <Badge variant="default" className="text-lg px-4 py-2">
          MCA Approved Provider
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">COMAR Alignment</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alignmentPercentage.toFixed(0)}%</div>
            <Progress value={alignmentPercentage} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {alignedCount}/{totalCompliance} requirements aligned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Position</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#2</div>
            <p className="text-xs text-muted-foreground">
              Out of 6 approved providers
            </p>
            <Badge variant="secondary" className="mt-2">Alphabetical</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renewal Readiness</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{renewalStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Users tracked for 2026 renewal
            </p>
            <div className="flex gap-2 mt-2">
              {renewalStats.critical > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {renewalStats.critical} Critical
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {renewalStats.onTrack} On Track
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Competitors</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">
              Actively monitored
            </p>
            <Badge variant="outline" className="mt-2 text-xs">
              Weekly scans
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="compliance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compliance">Compliance Status</TabsTrigger>
          <TabsTrigger value="competitive">Competitive Intel</TabsTrigger>
          <TabsTrigger value="renewal">Renewal Tracking</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>COMAR 14.17.15.05(E)(2) Compliance</CardTitle>
              <CardDescription>
                Our curriculum alignment with Maryland RVT requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {complianceStatus?.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{item.comar_section}</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.requirement_text}
                      </p>
                      {item.gap_identified && (
                        <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                          Gap: {item.gap_identified}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={item.our_curriculum_aligned ? 'default' : 'destructive'}
                      className="ml-4"
                    >
                      {item.our_curriculum_aligned ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aligned
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Gap
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
                {complianceStatus?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No compliance tracking data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitor Intelligence</CardTitle>
              <CardDescription>
                MCA-approved RVT providers and their capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competitorData?.map((competitor: any) => (
                  <div
                    key={competitor.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{competitor.competitor_name}</div>
                      <Badge variant="outline">{competitor.website}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {competitor.features_detected?.map((feature: string) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                    {competitor.pricing_info?.amount && (
                      <div className="text-sm text-muted-foreground">
                        Pricing: ${competitor.pricing_info.amount}
                      </div>
                    )}
                  </div>
                ))}
                {competitorData?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No competitor data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>2026 Annual Renewal Tracking</CardTitle>
              <CardDescription>
                Users requiring training completion by January 1, 2026
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                  <div className="text-2xl font-bold text-red-700">{renewalStats.critical}</div>
                  <div className="text-sm text-red-600">Critical Risk</div>
                </div>
                <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-700">{renewalStats.high}</div>
                  <div className="text-sm text-yellow-600">High Risk</div>
                </div>
                <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                  <div className="text-2xl font-bold text-green-700">{renewalStats.onTrack}</div>
                  <div className="text-sm text-green-600">On Track</div>
                </div>
              </div>
              {renewalTracking?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No renewal tracking data yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Curriculum Recommendations</CardTitle>
              <CardDescription>
                Actionable improvements based on competitive intelligence and compliance analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations?.map((rec: any) => (
                  <div
                    key={rec.id}
                    className="p-4 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              rec.priority === 'critical'
                                ? 'destructive'
                                : rec.priority === 'high'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {rec.priority}
                          </Badge>
                          <Badge variant="outline">{rec.category}</Badge>
                        </div>
                        <h3 className="font-medium mt-2">{rec.title}</h3>
                      </div>
                      <Target className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">{rec.description}</p>
                    <div className="text-sm">
                      <strong>Why:</strong> {rec.rationale}
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Effort: {rec.estimated_effort}</span>
                      <span>Impact: {rec.impact}</span>
                    </div>
                  </div>
                ))}
                {recommendations?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No pending recommendations
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RVTIntelligence;
