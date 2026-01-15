import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useMyRoleRequests } from '@/hooks/useRoleRequests';
import type { MemberType } from '@/hooks/useOrganizationMembership';

const memberTypeLabels: Record<MemberType, string> = {
  employee: 'Employee',
  coordinator: 'Training Coordinator',
  manager: 'Manager',
  owner: 'Owner',
};

export const PendingApprovalBanner: React.FC = () => {
  const { data: requests, isLoading } = useMyRoleRequests();

  if (isLoading) return null;

  const pendingRequests = (requests || []).filter(r => r.status === 'pending');
  const recentDenied = (requests || []).filter(
    r => r.status === 'denied' && 
    new Date(r.updated_at).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000 // Within last 7 days
  );

  if (pendingRequests.length === 0 && recentDenied.length === 0) return null;

  return (
    <div className="space-y-3">
      {pendingRequests.map((request) => (
        <Alert key={request.id} className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">
            Role Request Pending
          </AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Your request for <strong>{memberTypeLabels[request.requested_member_type]}</strong> access
            {request.organization?.name && ` at ${request.organization.name}`} is awaiting approval.
            You can continue using the platform with your current access level.
          </AlertDescription>
        </Alert>
      ))}

      {recentDenied.map((request) => (
        <Alert key={request.id} className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-200">
            Role Request Denied
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            Your request for <strong>{memberTypeLabels[request.requested_member_type]}</strong> access was not approved.
            {request.review_notes && (
              <span className="block mt-1 text-sm">Reason: {request.review_notes}</span>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
};

export default PendingApprovalBanner;
