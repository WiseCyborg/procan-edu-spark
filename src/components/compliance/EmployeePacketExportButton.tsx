import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileDown, Loader2, Package } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmployeePacketExportButtonProps {
  organizationId: string;
  employeeUserId: string;
  employeeName?: string;
  rangeDays?: number;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export const EmployeePacketExportButton: React.FC<EmployeePacketExportButtonProps> = ({
  organizationId,
  employeeUserId,
  employeeName = 'Employee',
  rangeDays = 365,
  variant = 'outline',
  size = 'default',
  showLabel = true,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-employee-compliance-packet', {
        body: {
          organization_id: organizationId,
          employee_user_id: employeeUserId,
          range_days: rangeDays,
        },
      });

      if (error) throw error;

      if (!data?.success) {
        throw new Error(data?.error || 'Export failed');
      }

      // Open signed URL in new tab for download
      if (data.signed_url) {
        window.open(data.signed_url, '_blank');
        toast.success(`Compliance packet exported for ${employeeName}`, {
          description: `Contains ${data.summary?.total_certificates || 0} certificates, ${data.summary?.total_signoffs || 0} signoffs`,
        });
      } else {
        throw new Error('No download URL returned');
      }
    } catch (error: any) {
      console.error('Export error:', error);
      toast.error(`Failed to export packet: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const button = (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Package className="h-4 w-4" />
      )}
      {showLabel && size !== 'icon' && (
        <span className="ml-2">
          {isLoading ? 'Exporting...' : 'Export Packet'}
        </span>
      )}
    </Button>
  );

  if (size === 'icon' || !showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {button}
          </TooltipTrigger>
          <TooltipContent>
            <p>Export compliance packet for {employeeName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};
