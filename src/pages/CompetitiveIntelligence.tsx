import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Target, Loader2 } from 'lucide-react';

export default function CompetitiveIntelligence() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get latest snapshot for each competitor
      const { data: snapshotData } = await supabase
        .from('competitor_snapshots' as any)
        .select('*')
        .order('snapshot_date', { ascending: false });

      // Get unique latest snapshots
      const latestSnapshots = (snapshotData as any)?.reduce((acc: any[], curr: any) => {
        if (!acc.find((s: any) => s.competitor_name === curr.competitor_name)) {
          acc.push(curr);
        }
        return acc;
      }, []);

      setSnapshots(latestSnapshots || []);

      // Get unacknowledged alerts
      const { data: alertData } = await supabase
        .from('competitive_alerts' as any)
        .select('*')
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      setAlerts(alertData || []);
    } catch (error) {
      console.error('Error fetching competitive data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competitive Intelligence</h1>
          <p className="text-muted-foreground">Monitor competitors and stay ahead of the market</p>
        </div>
        <Badge variant="outline" className="text-lg">
          {snapshots.length} Competitors Tracked
        </Badge>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              {alerts.length} Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-card rounded-lg">
                <div>
                  <p className="font-medium">{alert.title}</p>
                  <p className="text-sm text-muted-foreground">{alert.message}</p>
                </div>
                <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                  {alert.severity}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="comparison">
        <TabsList>
          <TabsTrigger value="comparison">Price Comparison</TabsTrigger>
          <TabsTrigger value="features">Feature Matrix</TabsTrigger>
          <TabsTrigger value="trends">Market Positioning</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Comparison</CardTitle>
              <CardDescription>How we stack up against the competition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* ProCann EDU (Ours) */}
                <div className="p-4 bg-primary/10 border-2 border-primary rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg">ProCann EDU (Us)</h3>
                      <p className="text-sm text-muted-foreground">Maryland RVT Training</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold">$49.99</p>
                      <p className="text-sm text-muted-foreground">per seat</p>
                    </div>
                  </div>
                </div>

                {/* Competitors */}
                {snapshots.map(snapshot => (
                  <div key={snapshot.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{snapshot.competitor_name}</h3>
                        <p className="text-sm text-muted-foreground">{snapshot.market_positioning}</p>
                      </div>
                      <div className="text-right mr-4">
                        <p className="text-2xl font-bold">
                          ${snapshot.pricing?.seat_price || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {snapshot.pricing?.bulk_discount}% bulk discount
                        </p>
                      </div>
                      {snapshot.pricing?.seat_price && (
                        snapshot.pricing.seat_price > 49.99 ? (
                          <TrendingUp className="h-6 w-6 text-red-500" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-green-500" />
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Matrix</CardTitle>
              <CardDescription>Compare features across all competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="p-2 text-left">Feature</th>
                      <th className="p-2 text-center bg-primary/10">ProCann EDU</th>
                      {snapshots.map(s => (
                        <th key={s.id} className="p-2 text-center text-sm">{s.competitor_name.split(' ')[0]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">On-Demand Modules</td>
                      <td className="p-2 text-center bg-primary/10">
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                      {snapshots.map(s => (
                        <td key={s.id} className="p-2 text-center">
                          {s.features?.on_demand ? 
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                            <span className="text-muted-foreground">-</span>
                          }
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Live Training</td>
                      <td className="p-2 text-center bg-primary/10">
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                      {snapshots.map(s => (
                        <td key={s.id} className="p-2 text-center">
                          {s.features?.live_training ? 
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                            <span className="text-muted-foreground">-</span>
                          }
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">MCA Compliant</td>
                      <td className="p-2 text-center bg-primary/10">
                        <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                      </td>
                      {snapshots.map(s => (
                        <td key={s.id} className="p-2 text-center">
                          {s.features?.mca_compliant ? 
                            <CheckCircle className="h-5 w-5 text-green-600 mx-auto" /> : 
                            <span className="text-muted-foreground">-</span>
                          }
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Positioning</CardTitle>
              <CardDescription>Our competitive advantages</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Target className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-green-900 dark:text-green-100">Competitive Pricing</h3>
                      <p className="text-sm text-green-800 dark:text-green-200">
                        Our $49.99/seat is competitive with market average. 
                        {snapshots.filter(s => s.pricing?.seat_price > 49.99).length} competitors charge more.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Full Feature Parity</h3>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        We match or exceed competitor features across all tracked metrics.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
