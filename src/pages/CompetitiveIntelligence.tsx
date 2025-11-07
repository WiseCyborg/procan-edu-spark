import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, TrendingDown, TrendingUp, CheckCircle2, XCircle, DollarSign, ExternalLink } from "lucide-react";
import { CompetitorManagement } from "@/components/admin/CompetitorManagement";

interface CompetitorSnapshot {
  id: string;
  competitor_name: string;
  website_url: string | null;
  pricing_model: string | null;
  price_per_student: number | null;
  features_detected: string[] | null;
  market_position: string | null;
  snapshot_date: string;
}

interface CompetitiveAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  detected_at: string;
  acknowledged_at: string | null;
}

export default function CompetitiveIntelligence() {
  const { data: snapshots = [], isLoading: snapshotsLoading } = useQuery({
    queryKey: ['competitor-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false });
      if (error) throw error;
      return data as CompetitorSnapshot[];
    }
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['competitive-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitive_alerts')
        .select('*')
        .is('acknowledged_at', null)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data as CompetitiveAlert[];
    }
  });

  const loading = snapshotsLoading || alertsLoading;

  // Our current pricing
  const ourPrice = 49.99;
  
  const getCompetitorComparison = (competitorPrice: number | null) => {
    if (!competitorPrice) return { diff: 0, isHigher: false, text: 'Unknown' };
    const diff = Math.abs(competitorPrice - ourPrice);
    const percentage = ((diff / ourPrice) * 100).toFixed(0);
    const isHigher = competitorPrice > ourPrice;
    return {
      diff: parseFloat(percentage),
      isHigher,
      text: isHigher ? `${percentage}% more expensive` : `${percentage}% less expensive`
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitive Intelligence</h1>
          <p className="text-muted-foreground">Market analysis and competitor tracking</p>
        </div>
        <Badge variant="outline" className="text-sm">
          {snapshots.length} Competitors Tracked
        </Badge>
      </div>

      {loading && <div>Loading competitor data...</div>}

      {alerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant="default">
                <AlertTitle>{alert.title}</AlertTitle>
                <AlertDescription>
                  {alert.description}
                  <span className="text-xs text-muted-foreground block mt-1">
                    Detected {new Date(alert.detected_at).toLocaleDateString()}
                  </span>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <CompetitorManagement />

      <Tabs defaultValue="pricing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pricing">Price Comparison</TabsTrigger>
          <TabsTrigger value="features">Feature Matrix</TabsTrigger>
          <TabsTrigger value="positioning">Market Positioning</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pricing Analysis</CardTitle>
              <CardDescription>Compare training costs across competitors</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Price/Student</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>vs ProCann EDU</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-primary/5">
                    <TableCell className="font-bold">ProCann EDU (Us)</TableCell>
                    <TableCell className="font-bold">${ourPrice}</TableCell>
                    <TableCell>Per Student</TableCell>
                    <TableCell>—</TableCell>
                  </TableRow>
                  {snapshots.map((snapshot) => {
                    const comparison = getCompetitorComparison(snapshot.price_per_student);
                    
                    return (
                      <TableRow key={snapshot.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{snapshot.competitor_name}</span>
                            {snapshot.website_url && (
                              <a href={snapshot.website_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                                {new URL(snapshot.website_url).hostname}
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {snapshot.price_per_student ? (
                            <span className="font-medium">${snapshot.price_per_student}</span>
                          ) : (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="capitalize">
                          {snapshot.pricing_model?.replace('_', ' ') || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {snapshot.price_per_student ? (
                            <div className="flex items-center gap-1">
                              {comparison.isHigher ? (
                                <>
                                  <TrendingUp className="h-4 w-4 text-green-600" />
                                  <span className="text-green-600 text-sm">{comparison.text}</span>
                                </>
                              ) : (
                                <>
                                  <TrendingDown className="h-4 w-4 text-orange-600" />
                                  <span className="text-orange-600 text-sm">{comparison.text}</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">No data</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
              <CardDescription>Side-by-side feature analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>ProCann EDU</TableHead>
                    {snapshots.slice(0, 4).map((snapshot) => (
                      <TableHead key={snapshot.id}>{snapshot.competitor_name}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {['on-demand-modules', 'live-sessions', 'certificates', 'comar-compliant', 'compliance-tracking'].map((feature) => (
                    <TableRow key={feature}>
                      <TableCell className="font-medium capitalize">{feature.replace(/-/g, ' ')}</TableCell>
                      <TableCell><CheckCircle2 className="h-5 w-5 text-green-600" /></TableCell>
                      {snapshots.slice(0, 4).map((snapshot) => (
                        <TableCell key={snapshot.id}>
                          {snapshot.features_detected?.includes(feature) ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positioning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Position Analysis</CardTitle>
              <CardDescription>Competitive advantages and strategic positioning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Price Leadership
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Positioned at ${ourPrice} in the mid-market segment. 
                      {snapshots.filter(s => s.price_per_student && s.price_per_student > ourPrice).length} competitors charge more.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Feature Parity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Full feature set including on-demand modules, live sessions, and COMAR compliance certification.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Market Opportunity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {snapshots.length} tracked competitors. Strong positioning in Maryland's cannabis training market.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
