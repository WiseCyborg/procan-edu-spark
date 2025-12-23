import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, UserX, CheckCircle2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface ComplianceAlert {
  id: string;
  organization_id: string;
  employee_user_id: string;
  alert_type: string;
  first_shift_date: string;
  training_status: string;
  days_until_shift: number;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export const TrainingComplianceAlert = ({ organizationId }: { organizationId?: string }) => {
  const queryClient = useQueryClient();

  const { data: alerts, isLoading } = useQuery({
    queryKey: ['first-shift-alerts', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('first_shift_compliance_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('days_until_shift', { ascending: true });

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const alertsWithProfiles = await Promise.all(
        (data || []).map(async (alert) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', alert.employee_user_id)
            .single();
          return { ...alert, profiles: profile } as ComplianceAlert;
        })
      );
      return alertsWithProfiles;
    },
    refetchInterval: 60000,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('first_shift_compliance_alerts')
        .update({ 
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: user?.id
        })
        .eq('id', alertId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['first-shift-alerts'] });
      toast.success('Alert acknowledged');
    },
    onError: (error: Error) => {
      toast.error(`Failed to acknowledge: ${error.message}`);
    }
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'working_uncertified':
        return <UserX className="h-5 w-5 text-destructive" />;
      case 'deadline_passed':
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case 'approaching_deadline':
        return <Clock className="h-5 w-5 text-warning" />;
      case 'training_incomplete':
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'working_uncertified':
        return <Badge variant="destructive">Working Uncertified</Badge>;
      case 'deadline_passed':
        return <Badge variant="destructive">Deadline Passed</Badge>;
      case 'approaching_deadline':
        return <Badge className="bg-warning text-warning-foreground">Approaching Deadline</Badge>;
      case 'training_incomplete':
        return <Badge variant="secondary">Training Incomplete</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const criticalAlerts = alerts?.filter(a => 
    a.alert_type === 'working_uncertified' || a.alert_type === 'deadline_passed'
  ) || [];

  const warningAlerts = alerts?.filter(a => 
    a.alert_type === 'approaching_deadline' || a.alert_type === 'training_incomplete'
  ) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Training Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Training Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">All employees are on track with their training.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Training Compliance Alerts
          <Badge variant="outline" className="ml-2">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {criticalAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-destructive">Critical ({criticalAlerts.length})</h4>
            {criticalAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg border border-destructive/20"
              >
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.alert_type)}
                  <div>
                    <p className="font-medium">
                      {alert.profiles?.first_name} {alert.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      First shift: {format(new Date(alert.first_shift_date), 'MMM d, yyyy')} • 
                      Status: {alert.training_status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getAlertBadge(alert.alert_type)}
                  {!alert.acknowledged_at && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {warningAlerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-warning">Warnings ({warningAlerts.length})</h4>
            {warningAlerts.map((alert) => (
              <div 
                key={alert.id} 
                className="flex items-center justify-between p-3 bg-warning/10 rounded-lg border border-warning/20"
              >
                <div className="flex items-center gap-3">
                  {getAlertIcon(alert.alert_type)}
                  <div>
                    <p className="font-medium">
                      {alert.profiles?.first_name} {alert.profiles?.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      First shift: {format(new Date(alert.first_shift_date), 'MMM d, yyyy')} • 
                      {alert.days_until_shift > 0 ? `${alert.days_until_shift} days remaining` : 'Overdue'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getAlertBadge(alert.alert_type)}
                  {!alert.acknowledged_at && (
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => acknowledgeMutation.mutate(alert.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
