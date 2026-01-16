import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  UserPlus, 
  ClipboardList, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  ChevronRight,
  Building2,
  Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrganization } from '@/hooks/useOrganization';
import { usePendingRequestsCount, useOrgRoleRequests } from '@/hooks/useRoleRequests';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  progress: number;
  status: 'active' | 'invited' | 'completed';
}

interface CoordinatorStartPanelProps {
  organizationName?: string;
  totalEmployees?: number;
  activeTrainees?: number;
  completedTrainees?: number;
  pendingInvites?: number;
  complianceRate?: number;
  recentMembers?: TeamMember[];
  isLoading?: boolean;
  className?: string;
}

export const CoordinatorStartPanel: React.FC<CoordinatorStartPanelProps> = ({
  organizationName,
  totalEmployees = 0,
  activeTrainees = 0,
  completedTrainees = 0,
  pendingInvites = 0,
  complianceRate = 0,
  recentMembers = [],
  isLoading = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const { organization } = useOrganization();
  const { pendingCount: pendingRoleRequests } = usePendingRequestsCount(organization?.id || null);

  const orgName = organizationName || organization?.name || 'Your Organization';

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const quickStats = [
    {
      label: 'Total Team',
      value: totalEmployees,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'In Training',
      value: activeTrainees,
      icon: Clock,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      label: 'Certified',
      value: completedTrainees,
      icon: Award,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      label: 'Compliance',
      value: `${complianceRate}%`,
      icon: CheckCircle2,
      color: complianceRate >= 80 ? 'text-green-600' : 'text-amber-600',
      bgColor: complianceRate >= 80 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30',
    },
  ];

  const quickActions = [
    {
      label: 'Invite Employees',
      description: 'Send training invitations',
      icon: UserPlus,
      onClick: () => navigate('/dispensary-manager-dashboard?tab=team'),
      variant: 'default' as const,
    },
    {
      label: 'View Roster',
      description: 'See team progress',
      icon: ClipboardList,
      onClick: () => navigate('/dispensary-manager-dashboard?tab=roster'),
      variant: 'outline' as const,
    },
    {
      label: 'Run Reports',
      description: 'Compliance analytics',
      icon: TrendingUp,
      onClick: () => navigate('/dispensary-manager-dashboard?tab=analytics'),
      variant: 'outline' as const,
    },
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{orgName}</CardTitle>
              <CardDescription>Training Coordinator Dashboard</CardDescription>
            </div>
          </div>
          {pendingRoleRequests > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {pendingRoleRequests} pending request{pendingRoleRequests !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className={`p-3 rounded-lg ${stat.bgColor} text-center`}
              >
                <Icon className={`h-5 w-5 mx-auto mb-1 ${stat.color}`} />
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Pending Invites Alert */}
        {pendingInvites > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
            <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                {pendingInvites} invitation{pendingInvites !== 1 ? 's' : ''} pending
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Employees have been invited but haven't started training yet
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => navigate('/dispensary-manager-dashboard?tab=team')}
              className="flex-shrink-0"
            >
              Manage
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant={action.variant}
                onClick={action.onClick}
                className="h-auto py-3 flex-col items-start text-left"
              >
                <div className="flex items-center gap-2 w-full">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{action.label}</span>
                  <ChevronRight className="h-4 w-4 ml-auto" />
                </div>
                <span className="text-xs text-muted-foreground mt-1 font-normal">
                  {action.description}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Recent Team Activity */}
        {recentMembers.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              Recent Activity
            </h4>
            <div className="space-y-2">
              {recentMembers.slice(0, 3).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  <div className="text-right">
                    {member.status === 'completed' ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Certified
                      </Badge>
                    ) : member.status === 'invited' ? (
                      <Badge variant="secondary">Invited</Badge>
                    ) : (
                      <Badge variant="outline">{member.progress}%</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CoordinatorStartPanel;
