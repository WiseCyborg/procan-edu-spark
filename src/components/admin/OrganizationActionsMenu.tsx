import { useState } from 'react';
import { Copy, RefreshCw, Mail, Plus, FileText, Edit, MoreVertical, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { EditOrganizationDialog } from './EditOrganizationDialog';
import { AllocateSeatsDialog } from './AllocateSeatsDialog';

interface OrganizationActionsMenuProps {
  organization: {
    org_id: string;
    organization_name: string;
    join_code?: string;
    manager_email?: string;
    manager_registered: boolean;
    registration_token_expires_at?: string | null;
    total_seats?: number;
    license_number?: string;
    contact_person?: string;
    contact_phone?: string;
    address?: string;
  };
  onRefetch?: () => void;
}

export const OrganizationActionsMenu = ({ organization, onRefetch }: OrganizationActionsMenuProps) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);

  // Precondition checks
  const hasJoinCode = !!organization.join_code;
  const hasManagerEmail = !!organization.manager_email;
  const managerRegistered = organization.manager_registered;
  const hasSeats = (organization.total_seats ?? 0) > 0;

  const handleCopyJoinCode = async () => {
    if (organization.join_code) {
      await navigator.clipboard.writeText(organization.join_code);
      toast.success('Join code copied to clipboard');
    } else {
      toast.error('No join code available');
    }
  };

  const handleGenerateOrRegenerateJoinCode = async () => {
    setLoading('joincode');
    try {
      const { data, error } = await supabase.functions.invoke('generate-join-code', {
        body: { 
          organizationId: organization.org_id,
          maxUses: 100,
          expiryDays: 365
        }
      });

      if (error) throw error;

      const action = hasJoinCode ? 'regenerated' : 'generated';
      toast.success(`Join code ${action} successfully`);
      
      // Ask if they want to send to manager
      if (hasManagerEmail && !managerRegistered) {
        toast.info('Send the new join code to the manager?', {
          action: {
            label: 'Send Email',
            onClick: () => handleSendReminder(),
          },
        });
      }
      
      onRefetch?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate join code');
    } finally {
      setLoading(null);
    }
  };

  const handleSendReminder = async () => {
    if (!organization.manager_email) {
      toast.error('No manager email available');
      return;
    }

    if (managerRegistered) {
      toast.info('Manager is already registered');
      return;
    }

    setLoading('reminder');
    try {
      const { error } = await supabase.functions.invoke('send-manager-registration-reminder', {
        body: { 
          organizationId: organization.org_id,
          email: organization.manager_email,
          days_remaining: 7
        }
      });

      if (error) throw error;

      toast.success('Reminder email sent successfully');
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reminder');
    } finally {
      setLoading(null);
    }
  };

  const handleResendRegistration = async () => {
    if (!organization.manager_email) {
      toast.error('No manager email available');
      return;
    }

    if (managerRegistered) {
      toast.info('Manager is already registered');
      return;
    }

    setLoading('resend');
    try {
      // Call regenerate token function using organization_id
      const { data, error } = await supabase.rpc('regenerate_manager_token_by_org', {
        org_id: organization.org_id
      } as any);

      if (error) throw error;

      // Get the result (RPC returns table, access first row)
      const result = Array.isArray(data) ? data[0] : data;
      
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to regenerate token');
      }
      
      // Send the new registration email using the correct edge function
      const { error: emailError } = await supabase.functions.invoke('send-manager-registration-token', {
        body: { 
          application_id: result.application_id
        }
      });

      if (emailError) {
        console.warn('Email send failed but token was regenerated:', emailError);
        toast.success('Token regenerated! Email may have failed - check logs.');
      } else {
        toast.success('New registration link sent successfully');
      }
      
      onRefetch?.();
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to resend registration');
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateComplianceReport = async () => {
    setLoading('compliance');
    try {
      const { data, error } = await supabase.functions.invoke('generate-compliance-report', {
        body: { 
          organizationId: organization.org_id
        }
      });

      if (error) throw error;

      // If we get a PDF URL, open it
      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
        toast.success('Compliance report generated');
      } else if (data?.report) {
        // Display inline report data
        toast.success('Compliance report generated', {
          description: `Employees: ${data.report.employeeCount || 0}, Certified: ${data.report.certifiedCount || 0}`,
        });
      } else {
        toast.success('Compliance report generated');
      }

    } catch (error: any) {
      // Even if edge function fails, show what data exists
      toast.error('Compliance report feature requires setup', {
        description: 'Check organization details for current status',
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <TooltipProvider>
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {/* Communication Actions */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Communication
            </DropdownMenuLabel>
            
            {/* Copy Join Code - only show if exists */}
            {hasJoinCode && (
              <DropdownMenuItem onClick={handleCopyJoinCode}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Join Code
              </DropdownMenuItem>
            )}
            
            {/* Generate/Regenerate Join Code - dynamic label */}
            <DropdownMenuItem 
              onClick={handleGenerateOrRegenerateJoinCode}
              disabled={loading === 'joincode'}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading === 'joincode' ? 'animate-spin' : ''}`} />
              {hasJoinCode ? 'Regenerate Join Code' : 'Generate Join Code'}
            </DropdownMenuItem>
            
            {/* Send Manager Reminder - conditional with tooltip */}
            {managerRegistered ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem disabled className="opacity-50">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Manager Reminder
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manager already registered</p>
                </TooltipContent>
              </Tooltip>
            ) : hasManagerEmail ? (
              <DropdownMenuItem 
                onClick={handleSendReminder}
                disabled={loading === 'reminder'}
              >
                <Mail className={`h-4 w-4 mr-2 ${loading === 'reminder' ? 'animate-pulse' : ''}`} />
                Send Manager Reminder
              </DropdownMenuItem>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem disabled className="opacity-50">
                      <Mail className="h-4 w-4 mr-2" />
                      Send Manager Reminder
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>No manager email on file</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {/* Resend Registration - for unregistered managers */}
            {managerRegistered ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem disabled className="opacity-50">
                      <Send className="h-4 w-4 mr-2" />
                      Resend Registration
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Manager already registered</p>
                </TooltipContent>
              </Tooltip>
            ) : hasManagerEmail ? (
              <DropdownMenuItem 
                onClick={handleResendRegistration}
                disabled={loading === 'resend'}
              >
                <Send className={`h-4 w-4 mr-2 ${loading === 'resend' ? 'animate-pulse' : ''}`} />
                Resend Registration Link
              </DropdownMenuItem>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem disabled className="opacity-50">
                      <Send className="h-4 w-4 mr-2" />
                      Resend Registration
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>No manager email on file</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Management Actions */}
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Management
            </DropdownMenuLabel>
            
            {/* Allocate Seats - dynamic label based on existing seats */}
            <DropdownMenuItem onClick={() => setAllocateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {hasSeats ? 'Allocate More Seats' : 'Initialize Seat Allocation'}
            </DropdownMenuItem>
            
            {/* Compliance Report */}
            <DropdownMenuItem 
              onClick={handleGenerateComplianceReport}
              disabled={loading === 'compliance'}
            >
              <FileText className={`h-4 w-4 mr-2 ${loading === 'compliance' ? 'animate-pulse' : ''}`} />
              Compliance Report
            </DropdownMenuItem>
            
            {/* Edit Details */}
            <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Edit Organization Dialog */}
        <EditOrganizationDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          organization={{
            id: organization.org_id,
            organization_name: organization.organization_name,
            contact_person: organization.contact_person || '',
            contact_email: organization.manager_email || '',
            contact_phone: organization.contact_phone || '',
            address: organization.address || '',
            license_number: organization.license_number || '',
          }}
          onSaved={onRefetch}
        />

        {/* Allocate Seats Dialog */}
        <AllocateSeatsDialog
          open={allocateDialogOpen}
          onOpenChange={setAllocateDialogOpen}
          organizationId={organization.org_id}
          organizationName={organization.organization_name}
          onAllocated={onRefetch}
        />
      </>
    </TooltipProvider>
  );
};
