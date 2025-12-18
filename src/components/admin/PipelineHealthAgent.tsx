import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Play, 
  RefreshCw,
  Wrench,
  XCircle,
  Building2,
  Users,
  GraduationCap,
  Award,
  Zap,
  Info
} from 'lucide-react';
import {
  usePipelineHealthSnapshot,
  usePipelineHealthEvents,
  useRecentAutoFixes,
  useAdminAttentionItems,
  useRunPipelineHealthAgent,
  PipelineHealthEvent
} from '@/hooks/usePipelineHealthAgent';
import { formatDistanceToNow } from 'date-fns';

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    default:
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical':
      return <Badge variant="destructive">Critical</Badge>;
    case 'warning':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warning</Badge>;
    default:
      return <Badge variant="secondary">Info</Badge>;
  }
};

const getPipelineIcon = (pipeline: string) => {
  switch (pipeline) {
    case 'application':
      return <Building2 className="h-4 w-4" />;
    case 'organization':
      return <Building2 className="h-4 w-4" />;
    case 'seat':
      return <Users className="h-4 w-4" />;
    case 'training':
      return <GraduationCap className="h-4 w-4" />;
    case 'certification':
      return <Award className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const EventCard = ({ event }: { event: PipelineHealthEvent }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
    <div className="mt-0.5">
      {getSeverityIcon(event.severity)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        {getPipelineIcon(event.pipeline)}
        <span className="text-xs font-medium text-muted-foreground uppercase">
          {event.pipeline}
        </span>
        {getSeverityBadge(event.severity)}
        {event.auto_fixed && (
          <Badge variant="outline" className="text-green-600 border-green-600">
            <Wrench className="h-3 w-3 mr-1" />
            Auto-Fixed
          </Badge>
        )}
      </div>
      <p className="text-sm font-medium">{event.description}</p>
      {event.fix_action && (
        <p className="text-xs text-green-600 mt-1">
          ✓ {event.fix_action}
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
      </p>
    </div>
  </div>
);

export const PipelineHealthAgent: React.FC = () => {
  const { data: snapshot, isLoading: snapshotLoading } = usePipelineHealthSnapshot();
  const { data: events, isLoading: eventsLoading } = usePipelineHealthEvents();
  const { data: autoFixes } = useRecentAutoFixes();
  const { data: adminItems } = useAdminAttentionItems();
  const runAgent = useRunPipelineHealthAgent();

  const healthPercentage = snapshot 
    ? Math.round((snapshot.pipelines_healthy / snapshot.pipelines_total) * 100)
    : 0;

  const getHealthColor = () => {
    if (healthPercentage >= 90) return 'text-green-500';
    if (healthPercentage >= 70) return 'text-yellow-500';
    return 'text-destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Pipeline Health Agent</CardTitle>
              <CardDescription>
                Real-time monitoring & auto-remediation
              </CardDescription>
            </div>
          </div>
          <Button 
            onClick={() => runAgent.mutate()}
            disabled={runAgent.isPending}
            size="sm"
          >
            {runAgent.isPending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Agent
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-5 w-5 ${getHealthColor()}`} />
              <div>
                <p className="text-2xl font-bold">
                  {snapshot?.pipelines_healthy || 0}/{snapshot?.pipelines_total || 7}
                </p>
                <p className="text-xs text-muted-foreground">Pipelines Healthy</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{snapshot?.issues_detected || 0}</p>
                <p className="text-xs text-muted-foreground">Issues Detected</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{snapshot?.auto_fixed_today || 0}</p>
                <p className="text-xs text-muted-foreground">Auto-Fixed Today</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{snapshot?.needs_admin_attention || 0}</p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {snapshot?.last_run_at 
                    ? formatDistanceToNow(new Date(snapshot.last_run_at), { addSuffix: true })
                    : 'Never'}
                </p>
                <p className="text-xs text-muted-foreground">Last Run</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Pipeline Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-bold">{snapshot?.total_orgs || 0}</p>
            <p className="text-xs text-muted-foreground">Organizations</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{snapshot?.unregistered_managers || 0}</p>
            <p className="text-xs text-muted-foreground">Unregistered Managers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{snapshot?.stalled_users || 0}</p>
            <p className="text-xs text-muted-foreground">Stalled Users</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{snapshot?.total_certified || 0}</p>
            <p className="text-xs text-muted-foreground">Certified</p>
          </div>
        </div>

        {/* Events Tabs */}
        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recent" className="text-xs">
              Recent Events
              {events && events.length > 0 && (
                <Badge variant="secondary" className="ml-1">{events.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="fixes" className="text-xs">
              Auto-Fixes
              {autoFixes && autoFixes.length > 0 && (
                <Badge className="ml-1 bg-green-500">{autoFixes.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="admin" className="text-xs">
              Needs Attention
              {adminItems && adminItems.length > 0 && (
                <Badge variant="destructive" className="ml-1">{adminItems.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="recent">
            <ScrollArea className="h-[300px]">
              {eventsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : events && events.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                  <p>No recent events</p>
                  <p className="text-xs">Run the agent to check pipeline health</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="fixes">
            <ScrollArea className="h-[300px]">
              {autoFixes && autoFixes.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {autoFixes.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Zap className="h-12 w-12 mb-2" />
                  <p>No auto-fixes today</p>
                  <p className="text-xs">Agent automatically resolves deterministic issues</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="admin">
            <ScrollArea className="h-[300px]">
              {adminItems && adminItems.length > 0 ? (
                <div className="space-y-2 pr-4">
                  {adminItems.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mb-2 text-green-500" />
                  <p>Nothing needs attention</p>
                  <p className="text-xs">All critical issues are resolved</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default PipelineHealthAgent;
