import { useState } from 'react';
import { Copy, RefreshCw, Mail, Plus, FileText, Edit, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface OrganizationActionsMenuProps {
  organization: {
    org_id: string;
    organization_name: string;
    join_code?: string;
    manager_email?: string;
    manager_registered: boolean;
  };
  onRefetch?: () => void;
}

export const OrganizationActionsMenu = ({ organization, onRefetch }: OrganizationActionsMenuProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCopyJoinCode = () => {
    if (organization.join_code) {
      navigator.clipboard.writeText(organization.join_code);
      toast.success('Join code copied to clipboard');
    } else {
      toast.error('No join code available');
    }
  };

  const handleRegenerateJoinCode = async () => {
    setLoading('regenerate');
    try {
      const { data, error } = await supabase.functions.invoke('generate-join-code', {
        body: { 
          organizationId: organization.org_id,
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

  const handleSendReminder = async () => {
    if (!organization.manager_email) {
      toast.error('No manager email available');
      return;
    }

    setLoading('reminder');
    try {
      const { error } = await supabase.functions.invoke('send-manager-registration-reminder', {
        body: { 
          organizationId: organization.org_id,
          email: organization.manager_email
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {organization.join_code && (
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
        
        {!organization.manager_registered && organization.manager_email && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSendReminder}
              disabled={loading === 'reminder'}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Manager Reminder
            </DropdownMenuItem>
          </>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Plus className="h-4 w-4 mr-2" />
          Allocate More Seats
        </DropdownMenuItem>
        <DropdownMenuItem>
          <FileText className="h-4 w-4 mr-2" />
          Compliance Report
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="h-4 w-4 mr-2" />
          Edit Details
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};