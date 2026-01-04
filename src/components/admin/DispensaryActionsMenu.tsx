import { useState } from 'react';
import { Copy, RefreshCw, Mail, Plus, FileText, Edit, MoreVertical, Ban, Power, Trash2, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EditOrganizationDialog } from './EditOrganizationDialog';
import { AllocateSeatsDialog } from './AllocateSeatsDialog';

interface DispensaryApplication {
  id: string;
  organization_name: string;
  organization_id: string | null;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  license_number: string;
  application_status: string;
  requested_credits: number;
}

interface DispensaryActionsMenuProps {
  application: DispensaryApplication;
  joinCode?: string;
  managerRegistered?: boolean;
  onRefetch?: () => void;
  onSuspend?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
}

export const DispensaryActionsMenu = ({ 
  application, 
  joinCode,
  managerRegistered = false,
  onRefetch,
  onSuspend,
  onDelete,
  onApprove
}: DispensaryActionsMenuProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);

  const handleCopyJoinCode = async () => {
    if (joinCode) {
      await navigator.clipboard.writeText(joinCode);
      toast.success('Join code copied to clipboard');
    } else {
      toast.error('No join code available');
    }
  };

  const handleRegenerateJoinCode = async () => {
    if (!application.organization_id) {
      toast.error('Organization not found');
      return;
    }

    setLoading('regenerate');
    try {
      const { error } = await supabase.functions.invoke('generate-join-code', {
        body: { 
          organizationId: application.organization_id,
          maxUses: 100,
          expiryDays: 365
        }
      });

      if (error) throw error;
      toast.success('Join code regenerated successfully');
      onRefetch?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to regenerate join code');
    } finally {
      setLoading(null);
    }
  };

  const handleResendApprovalEmail = async () => {
    setLoading('resend');
    try {
      const { error } = await supabase.functions.invoke('send-application-approved', {
        body: { 
          applicationId: application.id,
          contactEmail: application.contact_email,
          contactPerson: application.contact_person,
          organizationName: application.organization_name
        }
      });

      if (error) throw error;
      toast.success('Approval email resent successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend approval email');
    } finally {
      setLoading(null);
    }
  };

  const handleSendManagerReminder = async () => {
    if (!application.organization_id) {
      toast.error('Organization not found');
      return;
    }

    setLoading('reminder');
    try {
      const { error } = await supabase.functions.invoke('send-manager-registration-reminder', {
        body: { 
          application_id: application.id,
          days_remaining: 7
        }
      });

      if (error) throw error;
      toast.success('Manager reminder email sent');
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminder');
    } finally {
      setLoading(null);
    }
  };

  const handleViewCompliance = () => {
    // Navigate to compliance report or generate PDF
    toast.info('Compliance report feature coming soon');
  };

  const handleReactivate = async () => {
    if (!application.organization_id) return;
    
    setLoading('reactivate');
    try {
      const { error } = await supabase.rpc('reactivate_organization', {
        p_org_id: application.organization_id
      });
      
      if (error) throw error;
      toast.success('Organization reactivated');
      onRefetch?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reactivate');
    } finally {
      setLoading(null);
    }
  };

  const isPending = application.application_status === 'pending';
  const isApproved = application.application_status === 'approved';
  const isSuspended = application.application_status === 'suspended';
  const hasOrganization = !!application.organization_id;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Communication Actions */}
          {(isApproved || isSuspended) && hasOrganization && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Communication
              </DropdownMenuLabel>
              
              {joinCode && (
                <DropdownMenuItem onClick={handleCopyJoinCode}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Join Code
                </DropdownMenuItem>
              )}
              
              <DropdownMenuItem 
                onClick={handleRegenerateJoinCode}
                disabled={loading === 'regenerate'}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading === 'regenerate' ? 'animate-spin' : ''}`} />
                Regenerate Join Code
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={handleResendApprovalEmail}
                disabled={loading === 'resend'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Resend Approval Email
              </DropdownMenuItem>
              
              {!managerRegistered && (
                <DropdownMenuItem 
                  onClick={handleSendManagerReminder}
                  disabled={loading === 'reminder'}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Manager Reminder
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
            </>
          )}

          {/* Management Actions */}
          {hasOrganization && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Management
              </DropdownMenuLabel>
              
              <DropdownMenuItem onClick={() => setAllocateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Allocate More Seats
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleViewCompliance}>
                <FileText className="h-4 w-4 mr-2" />
                Compliance Report
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Details
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
            </>
          )}

          {/* Status Actions */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Status
          </DropdownMenuLabel>
          
          {isPending && (
            <DropdownMenuItem
              onClick={onApprove}
              className="text-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Dispensary
            </DropdownMenuItem>
          )}
          
          {isApproved && hasOrganization && (
            <DropdownMenuItem
              onClick={onSuspend}
              className="text-orange-600"
            >
              <Ban className="h-4 w-4 mr-2" />
              Suspend Organization
            </DropdownMenuItem>
          )}
          
          {isSuspended && hasOrganization && (
            <DropdownMenuItem
              onClick={handleReactivate}
              disabled={loading === 'reactivate'}
              className="text-green-600"
            >
              <Power className="h-4 w-4 mr-2" />
              Reactivate Organization
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Application
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Dialog */}
      <EditOrganizationDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        organization={{
          id: application.id,
          organization_name: application.organization_name,
          contact_person: application.contact_person,
          contact_email: application.contact_email,
          contact_phone: application.contact_phone,
          address: application.address,
          license_number: application.license_number,
        }}
        onSaved={onRefetch}
      />

      {/* Allocate Seats Dialog */}
      {application.organization_id && (
        <AllocateSeatsDialog
          open={allocateDialogOpen}
          onOpenChange={setAllocateDialogOpen}
          organizationId={application.organization_id}
          organizationName={application.organization_name}
          onAllocated={onRefetch}
        />
      )}
    </>
  );
};
