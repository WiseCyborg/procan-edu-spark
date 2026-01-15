import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useOrgRoleRequests, useReviewRoleRequest, type RoleRequest } from '@/hooks/useRoleRequests';
import { useOrganization } from '@/hooks/useOrganization';
import { CheckCircle, XCircle, Clock, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { MemberType } from '@/hooks/useOrganizationMembership';

const memberTypeLabels: Record<MemberType, string> = {
  employee: 'Employee',
  coordinator: 'Training Coordinator',
  manager: 'Manager',
  owner: 'Owner',
};

const statusConfig = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  },
  denied: {
    label: 'Denied',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
};

interface ReviewDialogProps {
  request: RoleRequest | null;
  onClose: () => void;
  onSubmit: (status: 'approved' | 'denied', notes: string) => void;
  isSubmitting: boolean;
}

const ReviewDialog: React.FC<ReviewDialogProps> = ({
  request,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [notes, setNotes] = useState('');

  if (!request) return null;

  const userName = request.user?.first_name && request.user?.last_name
    ? `${request.user.first_name} ${request.user.last_name}`
    : 'Unknown User';

  return (
    <Dialog open={!!request} onOpenChange={() => onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Role Request</DialogTitle>
          <DialogDescription>
            Review and approve or deny this role request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{userName}</p>
              <p className="text-sm text-muted-foreground">
                Requested: {memberTypeLabels[request.requested_member_type]}
              </p>
            </div>
          </div>

          {request.justification && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">Justification:</p>
              <p className="text-sm text-muted-foreground">{request.justification}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Review Notes (optional)</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about your decision..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onSubmit('denied', notes)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Deny
          </Button>
          <Button
            onClick={() => onSubmit('approved', notes)}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export const RoleRequestsPanel: React.FC = () => {
  const { organizationId } = useOrganization();
  const { data: requests, isLoading } = useOrgRoleRequests(organizationId);
  const reviewMutation = useReviewRoleRequest();
  const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);

  const handleReview = async (status: 'approved' | 'denied', notes: string) => {
    if (!selectedRequest) return;

    await reviewMutation.mutateAsync({
      requestId: selectedRequest.id,
      status,
      reviewNotes: notes,
    });

    setSelectedRequest(null);
  };

  const pendingRequests = (requests || []).filter(r => r.status === 'pending');
  const processedRequests = (requests || []).filter(r => r.status !== 'pending');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Role Requests
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                {pendingRequests.length} pending
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(requests || []).length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No role requests at this time.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Pending requests first */}
              {pendingRequests.map((request) => {
                const StatusIcon = statusConfig[request.status].icon;
                const userName = request.user?.first_name && request.user?.last_name
                  ? `${request.user.first_name} ${request.user.last_name}`
                  : 'Unknown User';

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{userName}</p>
                        <p className="text-sm text-muted-foreground">
                          Requesting: {memberTypeLabels[request.requested_member_type]}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setSelectedRequest(request)}>
                      Review
                    </Button>
                  </div>
                );
              })}

              {/* Processed requests */}
              {processedRequests.slice(0, 5).map((request) => {
                const StatusIcon = statusConfig[request.status].icon;
                const userName = request.user?.first_name && request.user?.last_name
                  ? `${request.user.first_name} ${request.user.last_name}`
                  : 'Unknown User';

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {memberTypeLabels[request.requested_member_type]}
                        </p>
                      </div>
                    </div>
                    <Badge className={statusConfig[request.status].className}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[request.status].label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewDialog
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        onSubmit={handleReview}
        isSubmitting={reviewMutation.isPending}
      />
    </>
  );
};

export default RoleRequestsPanel;
