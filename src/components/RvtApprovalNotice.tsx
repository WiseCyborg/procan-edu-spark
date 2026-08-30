import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RvtApprovalNoticeProps {
  className?: string;
}

export const RvtApprovalNotice: React.FC<RvtApprovalNoticeProps> = ({ className }) => {
  return (
    <Alert
      role="note"
      className={cn(
        "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg w-full",
        className
      )}
    >
      <Info className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
      <AlertDescription className="text-sm leading-relaxed">
        <strong>ProCann EDU is not yet an MCA-approved Responsible Vendor Training provider.</strong> Our application is in preparation. Completing this course does <strong>not</strong> currently satisfy Maryland's annual Responsible Vendor Training requirement. We will update this notice as soon as approval is granted.
      </AlertDescription>
    </Alert>
  );
};
