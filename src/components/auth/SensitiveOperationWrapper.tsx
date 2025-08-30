import React, { useState, ReactNode } from 'react';
import { useReauthentication } from '@/hooks/useReauthentication';
import { ReauthenticationDialog } from './ReauthenticationDialog';
import { Button } from '@/components/ui/button';
import { Shield, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SensitiveOperationWrapperProps {
  operation: string;
  operationDescription: string;
  children: ReactNode;
  onExecute: () => void;
  urgency?: 'low' | 'medium' | 'high';
  requiresReauth?: boolean;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

export const SensitiveOperationWrapper: React.FC<SensitiveOperationWrapperProps> = ({
  operation,
  operationDescription,
  children,
  onExecute,
  urgency = 'medium',
  requiresReauth = true,
  className,
  variant = 'default',
  size = 'default',
  disabled = false
}) => {
  const { isRecentlyVerified } = useReauthentication();
  const [showReauthDialog, setShowReauthDialog] = useState(false);

  const handleClick = () => {
    if (!requiresReauth || isRecentlyVerified(operation)) {
      // User is recently verified, proceed with operation
      onExecute();
    } else {
      // Requires re-authentication
      setShowReauthDialog(true);
    }
  };

  const handleReauthSuccess = () => {
    setShowReauthDialog(false);
    onExecute();
  };

  const needsReauth = requiresReauth && !isRecentlyVerified(operation);

  return (
    <>
      <Button
        onClick={handleClick}
        variant={variant}
        size={size}
        disabled={disabled}
        className={cn(
          needsReauth && "relative",
          className
        )}
      >
        {needsReauth && (
          <Shield className="h-3 w-3 mr-1 text-amber-500" />
        )}
        {children}
        {needsReauth && (
          <Lock className="h-3 w-3 ml-1 text-muted-foreground" />
        )}
      </Button>

      <ReauthenticationDialog
        open={showReauthDialog}
        onClose={() => setShowReauthDialog(false)}
        onSuccess={handleReauthSuccess}
        operation={operation}
        operationDescription={operationDescription}
        urgency={urgency}
      />
    </>
  );
};