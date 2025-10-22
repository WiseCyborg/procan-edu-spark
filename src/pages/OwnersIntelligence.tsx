import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, AlertTriangle, CheckCircle, 
  DollarSign, Users, Shield, Mail, Brain, Play, RefreshCw 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

export default function OwnersIntelligence() {
  const { data: healthScore } = useQuery({
    queryKey: ['platform-health-score'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_health_scores')
        .select('*')
        .order('score_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: insights } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('actionable', true)
        .eq('action_taken', false)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    }
  });

  const { data: alerts } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: agentRuns } = useQuery({
    queryKey: ['ai-agent-runs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agent_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });

  const handleRunAgent = async (functionName: string) => {
    await supabase.functions.invoke(functionName);
    window.location.reload();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">AI Operations Center</h1>
          <p className="text-muted-foreground mt-2">
            Autonomous monitoring and intelligence for ProCann Education
          </p>
        </div>
        <Button variant="outline" size="lg" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-5 w-5" />
          Refresh All
        </Button>
      </div>

      <Card className="mb-8 border-primary shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            Platform Health Score
          </CardTitle>
          <CardDescription>AI-calculated overall system health</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Health</span>
                <span className="text-3xl font-bold text-primary">
                  {healthScore?.overall_score?.toFixed(1) || 'N/A'}/100
                </span>
              </div>
              <Progress 
                value={healthScore?.overall_score || 0} 
                className="h-4"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <HealthMetric label="Revenue" score={healthScore?.revenue_health_score} icon={<DollarSign className="h-5 w-5" />} />
              <HealthMetric label="Email" score={healthScore?.email_health_score} icon={<Mail className="h-5 w-5" />} />
              <HealthMetric label="Compliance" score={healthScore?.compliance_score} icon={<Shield className="h-5 w-5" />} />
              <HealthMetric label="Engagement" score={healthScore?.engagement_score} icon={<Users className="h-5 w-5" />} />
              <HealthMetric label="Security" score={healthScore?.security_score} icon={<CheckCircle className="h-5 w-5" />} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="alerts">Compliance Alerts</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="actions">Quick Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Actionable AI Insights</CardTitle>
              <CardDescription>AI-generated recommendations based on platform data</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights?.map(insight => (
                  <div key={insight.id} className="p-4 border rounded-lg hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getCategoryColor(insight.category)}>{insight.category}</Badge>
                          <Badge variant="outline">{(insight.confidence_score * 100).toFixed(0)}% confidence</Badge>
                        </div>
                        <h4 className="font-semibold mb-1">{insight.title}</h4>
                        <p className="text-sm text-muted-foreground">{insight.description}</p>
                      </div>
                      <Button size="sm" onClick={() => markInsightActioned(insight.id)}>Mark Done</Button>
                    </div>
                  </div>
                ))}
                {(!insights || insights.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No actionable insights at this time. AI agents are monitoring continuously.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Compliance Alerts</CardTitle>
              <CardDescription>Regulatory changes and compliance issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts?.map(alert => (
                  <div key={alert.id} className={`p-4 border-l-4 rounded-lg ${getSeverityBorder(alert.severity)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getSeverityBadge(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                          {alert.affected_users_count > 0 && (
                            <span className="text-sm text-muted-foreground">Affects {alert.affected_users_count} users</span>
                          )}
                        </div>
                        <h4 className="font-semibold mb-1">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>Resolve</Button>
                    </div>
                  </div>
                ))}
                {(!alerts || alerts.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    All clear! No active compliance alerts.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AgentCard
              name="Regulatory Compliance Monitor"
              description="Scrapes Maryland & federal regulations daily"
              lastRun={agentRuns?.find(r => r.agent_name.includes('Regulation'))?.created_at}
              status="active"
              onRun={() => handleRunAgent('scrape-regulations')}
            />
            <AgentCard
              name="Daily Digest Generator"
              description="AI-powered owner intelligence reports"
              lastRun={agentRuns?.find(r => r.agent_name.includes('Digest'))?.created_at}
              status="active"
              onRun={() => handleRunAgent('generate-daily-digest')}
            />
            <AgentCard
              name="Revenue Intelligence Bot"
              description="Analyzes payment patterns and forecasts"
              lastRun={agentRuns?.find(r => r.agent_name.includes('Revenue'))?.created_at}
              status="active"
              onRun={() => handleRunAgent('analyze-payment-patterns')}
            />
            <AgentCard
              name="Email Health Monitor"
              description="Tracks email deliverability and performance"
              lastRun={agentRuns?.find(r => r.agent_name.includes('Email'))?.created_at}
              status="active"
              onRun={() => handleRunAgent('test-email-providers')}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Agent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {agentRuns?.map(run => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant={run.execution_status === 'success' ? 'default' : 'destructive'}>{run.execution_status}</Badge>
                      <span className="font-medium">{run.agent_name}</span>
                      <span className="text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
                    </div>
                    <span className="text-muted-foreground">{run.items_processed} items</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionCard
              title="Trigger Regulatory Scrape"
              description="Force immediate check of all regulation sources"
              icon={<Shield className="h-8 w-8" />}
              action={() => handleRunAgent('scrape-regulations')}
            />
            <QuickActionCard
              title="Generate Owner Digest"
              description="Create and send daily intelligence report now"
              icon={<Mail className="h-8 w-8" />}
              action={() => handleRunAgent('generate-daily-digest')}
            />
            <QuickActionCard
              title="Analyze Revenue Trends"
              description="Run AI analysis on payment patterns"
              icon={<DollarSign className="h-8 w-8" />}
              action={() => handleRunAgent('analyze-payment-patterns')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const HealthMetric = ({ label, score, icon }: { label: string; score?: number; icon: React.ReactNode }) => (
  <div className="text-center p-4 border rounded-lg">
    <div className="flex justify-center mb-2 text-primary">{icon}</div>
    <div className="text-2xl font-bold mb-1">{score?.toFixed(0) || 'N/A'}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);

const AgentCard = ({ name, description, lastRun, status, onRun }: any) => (
  <Card>
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-lg">{name}</CardTitle>
          <CardDescription className="mt-1">{description}</CardDescription>
        </div>
        <Badge variant={status === 'active' ? 'default' : 'secondary'}>{status}</Badge>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Last run: {lastRun ? new Date(lastRun).toLocaleString() : 'Never'}
        </span>
        {status === 'active' && (
          <Button size="sm" onClick={onRun}>
            <Play className="h-4 w-4 mr-1" />
            Run Now
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

const QuickActionCard = ({ title, description, icon, action }: any) => (
  <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={action}>
    <CardHeader>
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg text-primary">{icon}</div>
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription className="text-xs mt-1">{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
  </Card>
);

function getCategoryColor(category: string) {
  const colors: Record<string, any> = {
    revenue: 'default',
    compliance: 'destructive',
    engagement: 'secondary',
    security: 'outline'
  };
  return colors[category] || 'default';
}

function getSeverityBorder(severity: string) {
  const borders: Record<string, string> = {
    critical: 'border-l-destructive bg-destructive/5',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-blue-500 bg-blue-50'
  };
  return borders[severity] || borders.medium;
}

function getSeverityBadge(severity: string) {
  const badges: Record<string, any> = {
    critical: 'destructive',
    high: 'destructive',
    medium: 'secondary',
    low: 'outline'
  };
  return badges[severity] || 'secondary';
}

async function markInsightActioned(insightId: string) {
  await supabase
    .from('ai_insights')
    .update({ action_taken: true, action_taken_at: new Date().toISOString() })
    .eq('id', insightId);
  window.location.reload();
}

async function resolveAlert(alertId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  await supabase
    .from('compliance_alerts')
    .update({ 
      resolved: true, 
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id 
    })
    .eq('id', alertId);
  window.location.reload();
}
