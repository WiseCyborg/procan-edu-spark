import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Activity, 
  Clock,
  User,
  MapPin,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface SecurityEvent {
  id: string;
  user_id: string;
  organization_id: string;
  event_type: string;
  severity: string;
  source_ip: string;
  user_agent: string;
  details: any;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  user_id: string;
  table_name: string;
  action_type: string;
  record_id: string;
  old_values: any;
  new_values: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export const SecurityMonitoringDashboard = () => {
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThreats, setActiveThreats] = useState(0);
  const [resolvedToday, setResolvedToday] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchSecurityData();
    
    // Set up real-time subscription for security events
    const eventsSubscription = supabase
      .channel('security_events')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'security_events' }, 
        handleNewSecurityEvent
      )
      .subscribe();

    return () => {
      eventsSubscription.unsubscribe();
    };
  }, []);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch security events
      const { data: events, error: eventsError } = await supabase
        .from('security_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (eventsError) throw eventsError;

      // Fetch audit logs
      const { data: logs, error: logsError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;

      setSecurityEvents(events || []);
      setAuditLogs(logs || []);

      // Calculate statistics
      const unresolved = events?.filter(event => !event.resolved_at).length || 0;
      const today = new Date().toDateString();
      const resolvedTodayCount = events?.filter(event => 
        event.resolved_at && new Date(event.resolved_at).toDateString() === today
      ).length || 0;

      setActiveThreats(unresolved);
      setResolvedToday(resolvedTodayCount);

    } catch (error) {
      console.error('Error fetching security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewSecurityEvent = (payload: any) => {
    const newEvent = payload.new as SecurityEvent;
    setSecurityEvents(prev => [newEvent, ...prev.slice(0, 49)]);
    setActiveThreats(prev => prev + 1);

    // Show toast for high severity events
    if (newEvent.severity === 'high') {
      toast({
        title: "High Severity Security Event",
        description: `${newEvent.event_type} detected`,
        variant: "destructive",
      });
    }
  };

  const resolveSecurityEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('security_events')
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', eventId);

      if (error) throw error;

      setSecurityEvents(prev => 
        prev.map(event => 
          event.id === eventId 
            ? { ...event, resolved_at: new Date().toISOString() }
            : event
        )
      );

      setActiveThreats(prev => prev - 1);
      setResolvedToday(prev => prev + 1);

      toast({
        title: "Event Resolved",
        description: "Security event has been marked as resolved",
      });
    } catch (error) {
      console.error('Error resolving security event:', error);
      toast({
        title: "Error",
        description: "Failed to resolve security event",
        variant: "destructive",
      });
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('login')) return <User className="h-4 w-4" />;
    if (eventType.includes('permission')) return <Lock className="h-4 w-4" />;
    if (eventType.includes('data')) return <Shield className="h-4 w-4" />;
    return <Activity className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Monitoring</h2>
          <p className="text-muted-foreground">
            Real-time security events and audit trail monitoring
          </p>
        </div>
        <Button onClick={fetchSecurityData} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Threats</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{activeThreats}</div>
            <p className="text-xs text-muted-foreground">Unresolved security events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{resolvedToday}</div>
            <p className="text-xs text-muted-foreground">Events resolved today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityEvents.length}</div>
            <p className="text-xs text-muted-foreground">Recent security events</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Entries</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">Recent audit log entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Threats Alert */}
      {activeThreats > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {activeThreats} unresolved security event(s) require immediate attention.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>
                Real-time security events and threat detection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {getEventIcon(event.event_type)}
                        <div>
                          <div className="font-medium">{event.event_type}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(event.created_at), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getSeverityBadge(event.severity)}
                        {event.resolved_at ? (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {event.source_ip && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {event.source_ip}
                        </div>
                      )}
                      
                      {!event.resolved_at && (
                        <Button
                          onClick={() => resolveSecurityEvent(event.id)}
                          size="sm"
                          variant="outline"
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {securityEvents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No security events detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>
                Detailed audit log of all system changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{log.action_type}</span>
                        <Badge variant="outline">{log.table_name}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                      </div>
                      {log.ip_address && (
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {log.ip_address}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Record ID: {log.record_id?.slice(0, 8)}...
                      </div>
                      {log.user_id && (
                        <div className="text-sm text-muted-foreground">
                          User: {log.user_id.slice(0, 8)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {auditLogs.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No audit logs available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Event Types</CardTitle>
                <CardDescription>Breakdown by event type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(
                    securityEvents.reduce((acc, event) => {
                      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => (
                    <div key={type} className="flex justify-between items-center">
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Severity Distribution</CardTitle>
                <CardDescription>Events by severity level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['high', 'medium', 'low'].map(severity => {
                    const count = securityEvents.filter(e => e.severity === severity).length;
                    return (
                      <div key={severity} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{severity}</span>
                        {getSeverityBadge(severity)}
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};