import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Activity, 
  Award, 
  DollarSign, 
  Building, 
  Shield, 
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Database
} from 'lucide-react';
import { useRealTimeAnalytics } from '@/hooks/useRealTimeAnalytics';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  status?: 'healthy' | 'warning' | 'error';
}

const MetricCard = ({ title, value, subtitle, icon, trend, status }: MetricCardProps) => (
  <Card className="h-full">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <div className="flex items-center gap-2">
        {status && (
          <Badge 
            variant={status === 'healthy' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
            className="h-2 w-2 p-0 rounded-full"
          />
        )}
        {icon}
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      )}
    </CardContent>
  </Card>
);

export const RealTimeMetricsGrid = () => {
  const { metrics, loading } = useRealTimeAnalytics();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="h-32 animate-pulse">
            <div className="h-full bg-muted/50 rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* User Activity */}
      <MetricCard
        title="Active Users"
        value={metrics.activeUsers}
        subtitle="Currently online"
        icon={<Users className="h-4 w-4" />}
        status="healthy"
      />
      
      <MetricCard
        title="Total Sessions"
        value={metrics.totalSessions}
        subtitle="Past 24 hours"
        icon={<Activity className="h-4 w-4" />}
        status="healthy"
      />

      {/* Course Progress */}
      <MetricCard
        title="Active Students"
        value={metrics.courseProgress.activeStudents}
        subtitle="Learning today"
        icon={<Users className="h-4 w-4" />}
        status="healthy"
      />

      <MetricCard
        title="Completions Today"
        value={metrics.courseProgress.completionsToday}
        subtitle={`${metrics.courseProgress.averageProgress.toFixed(1)}% avg progress`}
        icon={<CheckCircle className="h-4 w-4" />}
        status="healthy"
      />

      {/* Certificates */}
      <MetricCard
        title="Certificates Today"
        value={metrics.certificates.generatedToday}
        subtitle={`${metrics.certificates.pending} pending`}
        icon={<Award className="h-4 w-4" />}
        status={metrics.certificates.failed > 0 ? 'warning' : 'healthy'}
      />

      <MetricCard
        title="Certificate Failures"
        value={metrics.certificates.failed}
        subtitle="Needs attention"
        icon={<AlertTriangle className="h-4 w-4" />}
        status={metrics.certificates.failed > 0 ? 'error' : 'healthy'}
      />

      {/* Payments */}
      <MetricCard
        title="Revenue Today"
        value={`$${metrics.payments.totalRevenue.toFixed(2)}`}
        subtitle={`${metrics.payments.completedToday} transactions`}
        icon={<DollarSign className="h-4 w-4" />}
        status="healthy"
      />

      <MetricCard
        title="Processing Payments"
        value={metrics.payments.processing}
        subtitle={`${metrics.payments.failedToday} failed today`}
        icon={<Clock className="h-4 w-4" />}
        status={metrics.payments.failedToday > 0 ? 'warning' : 'healthy'}
      />

      {/* Organizations */}
      <MetricCard
        title="Active Organizations"
        value={metrics.organizations.active}
        subtitle={`${metrics.organizations.newSignups} new today`}
        icon={<Building className="h-4 w-4" />}
        status="healthy"
      />

      <MetricCard
        title="Compliance Alerts"
        value={metrics.organizations.complianceAlerts}
        subtitle="Require attention"
        icon={<AlertTriangle className="h-4 w-4" />}
        status={metrics.organizations.complianceAlerts > 0 ? 'warning' : 'healthy'}
      />

      {/* Security */}
      <MetricCard
        title="Security Threats"
        value={metrics.security.activeThreats}
        subtitle={`${metrics.security.loginAttempts} login attempts`}
        icon={<Shield className="h-4 w-4" />}
        status={metrics.security.activeThreats > 0 ? 'error' : 'healthy'}
      />

      {/* System Health */}
      <MetricCard
        title="System Health"
        value="Operational"
        subtitle={`DB: ${metrics.systemHealth.database}, API: ${metrics.systemHealth.api}`}
        icon={<Database className="h-4 w-4" />}
        status={
          metrics.systemHealth.database === 'down' || metrics.systemHealth.api === 'down' 
            ? 'error' 
            : metrics.systemHealth.database === 'degraded' || metrics.systemHealth.api === 'degraded'
            ? 'warning'
            : 'healthy'
        }
      />
    </div>
  );
};