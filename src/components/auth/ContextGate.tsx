import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationMemberships, useHighestMemberType, type MemberType } from '@/hooks/useOrganizationMembership';
import { useMyRoleRequests } from '@/hooks/useRoleRequests';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  Clock, 
  Building2, 
  User, 
  Shield, 
  ArrowRight,
  Loader2 
} from 'lucide-react';

const memberTypeConfig: Record<MemberType, { label: string; color: string; icon: React.ElementType }> = {
  employee: { label: 'Employee', color: 'bg-slate-100 text-slate-800', icon: User },
  coordinator: { label: 'Training Coordinator', color: 'bg-blue-100 text-blue-800', icon: Shield },
  manager: { label: 'Manager', color: 'bg-purple-100 text-purple-800', icon: Building2 },
  owner: { label: 'Owner', color: 'bg-emerald-100 text-emerald-800', icon: Building2 },
};

interface ContextGateProps {
  onContinue?: () => void;
}

/**
 * Context Gate Component
 * Shows user their authentication status, organization, and role status
 * before proceeding to the dashboard
 */
export const ContextGate: React.FC<ContextGateProps> = ({ onContinue }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: memberships, isLoading: membershipLoading } = useOrganizationMemberships();
  const { highestMemberType, canManageOrg, canViewTeam } = useHighestMemberType();
  const { data: roleRequests, isLoading: requestsLoading } = useMyRoleRequests();

  const isLoading = membershipLoading || requestsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingRequests = (roleRequests || []).filter(r => r.status === 'pending');
  const activeMemberships = memberships || [];

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      // Route based on highest authority
      if (canManageOrg) {
        navigate('/dispensary-manager');
      } else if (canViewTeam) {
        navigate('/training-coordinator');
      } else {
        navigate('/student');
      }
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">Welcome Back!</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Identity */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium">{user?.email}</p>
          </div>
        </div>

        {/* Organization Memberships */}
        {activeMemberships.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Your Organizations</p>
            {activeMemberships.map((membership) => {
              const config = memberTypeConfig[membership.member_type];
              const Icon = config.icon;
              return (
                <div
                  key={membership.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {membership.organization?.name || 'Organization'}
                      </p>
                    </div>
                  </div>
                  <Badge className={config.color}>
                    <Icon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">No organization memberships yet.</p>
            <p className="text-xs mt-1">You can still access individual courses.</p>
          </div>
        )}

        {/* Pending Role Requests */}
        {pendingRequests.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Pending Requests</p>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-center gap-3 p-3 border border-amber-200 bg-amber-50/50 rounded-lg dark:border-amber-800 dark:bg-amber-950/20"
              >
                <Clock className="h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-medium text-sm text-amber-800 dark:text-amber-200">
                    {memberTypeConfig[request.requested_member_type].label} Access
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Awaiting approval
                    {request.organization?.name && ` from ${request.organization.name}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Continue Button */}
        <Button onClick={handleContinue} className="w-full" size="lg">
          Continue to Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        {/* Pending note */}
        {pendingRequests.length > 0 && (
          <p className="text-xs text-center text-muted-foreground">
            You can use the platform with your current access while requests are pending.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ContextGate;
