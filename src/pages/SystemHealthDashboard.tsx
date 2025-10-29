import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  Mail, 
  CreditCard, 
  Users, 
  Brain, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

const SystemHealthDashboard = () => {
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState<any>({
    email: { status: 'unknown', last_sent: null, success_rate: 0 },
    payment: { status: 'unknown', pending_count: 0 },
    seats: { utilization: 0, total: 0, available: 0 },
    ai_agents: [],
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchHealthData();
  }, [isAdmin]);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      // Email health
      const { data: emailLogs } = await supabase
        .from('email_logs')
        .select('status, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      const emailSuccess = emailLogs?.filter(e => e.status === 'sent').length || 0;
      const emailTotal = emailLogs?.length || 1;
      const emailSuccessRate = ((emailSuccess / emailTotal) * 100).toFixed(1);

      // Payment health
      const { data: payments } = await supabase
        .from('payments')
        .select('status')
        .eq('status', 'pending');

      // Seats utilization
      const { data: seats } = await supabase
        .from('rvt_seats')
        .select('status');

      const totalSeats = seats?.length || 0;
      const assignedSeats = seats?.filter(s => s.status === 'assigned' || s.status === 'used').length || 0;
      const seatUtilization = totalSeats > 0 ? ((assignedSeats / totalSeats) * 100).toFixed(1) : '0';

      // AI agent runs
      const { data: agentRuns } = await supabase
        .from('ai_agent_runs')
        .select('agent_name, execution_status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      const agentSummary = agentRuns?.reduce((acc: any, run) => {
        if (!acc[run.agent_name]) {
          acc[run.agent_name] = { success: 0, failed: 0, last_run: run.created_at };
        }
        if (run.execution_status === 'success') acc[run.agent_name].success++;
        if (run.execution_status === 'failed') acc[run.agent_name].failed++;
        return acc;
      }, {});

      setHealthData({
        email: {
          status: parseFloat(emailSuccessRate) > 95 ? 'healthy' : parseFloat(emailSuccessRate) > 80 ? 'warning' : 'critical',
          success_rate: emailSuccessRate,
          last_sent: emailLogs?.[0]?.created_at,
        },
        payment: {
          status: (payments?.length || 0) > 10 ? 'warning' : 'healthy',
          pending_count: payments?.length || 0,
        },
        seats: {
          utilization: seatUtilization,
          total: totalSeats,
          available: totalSeats - assignedSeats,
          status: parseFloat(seatUtilization) > 90 ? 'warning' : 'healthy',
        },
        ai_agents: Object.entries(agentSummary || {}).map(([name, data]: [string, any]) => ({
          name,
          ...data,
          status: data.failed > data.success ? 'critical' : data.failed > 0 ? 'warning' : 'healthy',
        })),
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      healthy: 'default',
      warning: 'outline',
      critical: 'destructive',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Dashboard</h1>
          <p className="text-muted-foreground">Monitor platform performance and service health</p>
        </div>
        <Button onClick={fetchHealthData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Email Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Service</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusIcon(healthData.email.status)}
              {getStatusBadge(healthData.email.status)}
            </div>
            <p className="text-2xl font-bold mt-2">{healthData.email.success_rate}%</p>
            <p className="text-xs text-muted-foreground">Success rate (last 100)</p>
          </CardContent>
        </Card>

        {/* Payment Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusIcon(healthData.payment.status)}
              {getStatusBadge(healthData.payment.status)}
            </div>
            <p className="text-2xl font-bold mt-2">{healthData.payment.pending_count}</p>
            <p className="text-xs text-muted-foreground">Pending transactions</p>
          </CardContent>
        </Card>

        {/* Seat Utilization */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seat Utilization</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {getStatusIcon(healthData.seats.status)}
              {getStatusBadge(healthData.seats.status)}
            </div>
            <p className="text-2xl font-bold mt-2">{healthData.seats.utilization}%</p>
            <p className="text-xs text-muted-foreground">
              {healthData.seats.available} of {healthData.seats.total} available
            </p>
          </CardContent>
        </Card>

        {/* AI Agents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Agents</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{healthData.ai_agents.length}</p>
            <p className="text-xs text-muted-foreground">Active agents running</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Agent Details */}
      <Card>
        <CardHeader>
          <CardTitle>AI Agent Status</CardTitle>
          <CardDescription>Recent execution history for automated agents</CardDescription>
        </CardHeader>
        <CardContent>
          {healthData.ai_agents.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No agent runs recorded</p>
          ) : (
            <div className="space-y-3">
              {healthData.ai_agents.map((agent: any) => (
                <div key={agent.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(agent.status)}
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.success} success, {agent.failed} failed
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(agent.status)}
                    <p className="text-xs text-muted-foreground mt-1">
                      Last: {new Date(agent.last_run).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Button variant="outline" onClick={() => navigate('/admin-management?tab=email')}>
          View Email Logs
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin-management?tab=payments')}>
          View Payments
        </Button>
        <Button variant="outline" onClick={() => navigate('/admin-management?tab=seats')}>
          Manage Seats
        </Button>
      </div>
    </div>
  );
};

export default SystemHealthDashboard;
