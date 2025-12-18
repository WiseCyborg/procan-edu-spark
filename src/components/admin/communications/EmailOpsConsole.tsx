import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, Play, Pause, AlertTriangle, CheckCircle, XCircle, 
  Mail, Clock, Activity, Zap, Send, Users, RotateCcw
} from 'lucide-react';
import { 
  useEmailHealthSnapshot, 
  useEmailIncidents, 
  useRunEmailHealthAgent,
  usePauseSends,
  useResumeSends,
  useEmailRealtimeUpdates
} from '@/hooks/useEmailOpsConsole';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const KPICard = ({ 
  label, 
  value, 
  subValue, 
  icon: Icon, 
  status 
}: { 
  label: string; 
  value: string | number; 
  subValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  status?: 'healthy' | 'warning' | 'critical';
}) => {
  const statusColors = {
    healthy: 'text-green-600',
    warning: 'text-yellow-600',
    critical: 'text-red-600',
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold ${status ? statusColors[status] : ''}`}>
              {value}
            </p>
            {subValue && <p className="text-xs text-muted-foreground">{subValue}</p>}
          </div>
          <div className={`p-2 rounded-full ${status === 'critical' ? 'bg-red-100' : status === 'warning' ? 'bg-yellow-100' : 'bg-green-100'}`}>
            <Icon className={`h-5 w-5 ${status ? statusColors[status] : 'text-muted-foreground'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const CircuitStateIndicator = ({ state, reason }: { state: string; reason: string | null }) => {
  const config = {
    closed: { color: 'bg-green-500', label: 'Closed (Active)', icon: CheckCircle },
    open: { color: 'bg-red-500', label: 'Open (Paused)', icon: XCircle },
    half_open: { color: 'bg-yellow-500', label: 'Half-Open (Testing)', icon: AlertTriangle },
  };

  const current = config[state as keyof typeof config] || config.closed;
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${current.color} animate-pulse`} />
      <span className="font-medium">{current.label}</span>
      {reason && <span className="text-sm text-muted-foreground">— {reason}</span>}
    </div>
  );
};

export const EmailOpsConsole = () => {
  const { data: snapshot, isLoading: snapshotLoading } = useEmailHealthSnapshot();
  const { data: incidents } = useEmailIncidents();
  const runAgent = useRunEmailHealthAgent();
  const pauseSends = usePauseSends();
  const resumeSends = useResumeSends();
  
  // Enable realtime updates
  useEmailRealtimeUpdates();

  const handleRunAgent = async () => {
    try {
      await runAgent.mutateAsync();
      toast.success('Email Health Agent completed');
    } catch (error) {
      toast.error('Failed to run health agent');
    }
  };

  const handlePauseSends = async () => {
    try {
      await pauseSends.mutateAsync();
      toast.warning('Email sends paused');
    } catch (error) {
      toast.error('Failed to pause sends');
    }
  };

  const handleResumeSends = async () => {
    try {
      await resumeSends.mutateAsync();
      toast.success('Email sends resumed');
    } catch (error) {
      toast.error('Failed to resume sends');
    }
  };

  const getDeliveryStatus = (rate: number | null): 'healthy' | 'warning' | 'critical' => {
    if (!rate) return 'healthy';
    if (rate >= 95) return 'healthy';
    if (rate >= 80) return 'warning';
    return 'critical';
  };

  const getBounceStatus = (rate: number | null): 'healthy' | 'warning' | 'critical' => {
    if (!rate) return 'healthy';
    if (rate <= 2) return 'healthy';
    if (rate <= 5) return 'warning';
    return 'critical';
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Email Operations Console
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring and control of email delivery
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRunAgent}
            disabled={runAgent.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${runAgent.isPending ? 'animate-spin' : ''}`} />
            Run Health Check
          </Button>
          {snapshot?.circuit_state === 'closed' ? (
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handlePauseSends}
              disabled={pauseSends.isPending}
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Sends
            </Button>
          ) : (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleResumeSends}
              disabled={resumeSends.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              Resume Sends
            </Button>
          )}
        </div>
      </div>

      {/* Circuit State Banner */}
      <Card className={snapshot?.circuit_state === 'open' ? 'border-red-500 bg-red-50' : ''}>
        <CardContent className="py-3">
          <div className="flex items-center justify-between">
            <CircuitStateIndicator 
              state={snapshot?.circuit_state || 'closed'} 
              reason={snapshot?.circuit_reason || null} 
            />
            {snapshot?.created_at && (
              <span className="text-sm text-muted-foreground">
                Last updated: {formatDistanceToNow(new Date(snapshot.created_at), { addSuffix: true })}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <KPICard
          label="Delivery Rate"
          value={`${snapshot?.delivery_rate_24h?.toFixed(1) || 0}%`}
          subValue="Last 24h"
          icon={CheckCircle}
          status={getDeliveryStatus(snapshot?.delivery_rate_24h || null)}
        />
        <KPICard
          label="Bounce Rate"
          value={`${snapshot?.bounce_rate_24h?.toFixed(1) || 0}%`}
          subValue="Last 24h"
          icon={XCircle}
          status={getBounceStatus(snapshot?.bounce_rate_24h || null)}
        />
        <KPICard
          label="Avg Latency"
          value={`${snapshot?.latency_avg_ms || 0}ms`}
          subValue="Send time"
          icon={Clock}
          status={snapshot?.latency_avg_ms && snapshot.latency_avg_ms > 1000 ? 'warning' : 'healthy'}
        />
        <KPICard
          label="Queue Depth"
          value={snapshot?.queue_depth || 0}
          subValue="Pending"
          icon={Mail}
          status={snapshot?.queue_depth && snapshot.queue_depth > 50 ? 'warning' : 'healthy'}
        />
        <KPICard
          label="Failures (1h)"
          value={snapshot?.failures_1h || 0}
          subValue="Last hour"
          icon={AlertTriangle}
          status={snapshot?.failures_1h && snapshot.failures_1h > 5 ? 'critical' : 'healthy'}
        />
        <KPICard
          label="Sent (24h)"
          value={snapshot?.emails_sent_24h || 0}
          subValue="Total sent"
          icon={Send}
        />
      </div>

      {/* Agent Status & Incidents */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Agent Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Agent Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">Email Health Agent</span>
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium">Personalization Agent</span>
              </div>
              <Badge variant="outline">Ready</Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="font-medium">Response Agent</span>
              </div>
              <Badge variant="secondary">Inbox Not Connected</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Incident Feed */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Incidents
              {incidents?.total && incidents.total > 0 && (
                <Badge variant="destructive">{incidents.total}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              {incidents?.total === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                  <p>No incidents in the last hour</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incidents?.failures.slice(0, 5).map((incident) => (
                    <div 
                      key={incident.id} 
                      className="flex items-start gap-3 p-2 rounded-lg bg-red-50 border border-red-100"
                    >
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 truncate">
                          Failed: {incident.recipient_email}
                        </p>
                        <p className="text-xs text-red-600 truncate">
                          {incident.error_message || 'Unknown error'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {incidents?.bounces.slice(0, 3).map((incident) => (
                    <div 
                      key={incident.id} 
                      className="flex items-start gap-3 p-2 rounded-lg bg-yellow-50 border border-yellow-100"
                    >
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-yellow-800 truncate">
                          Bounced: {incident.recipient_email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(incident.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Failed (Safe)
            </Button>
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Send Manager Reminders
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="h-4 w-4 mr-2" />
              Generate Daily Digest
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
