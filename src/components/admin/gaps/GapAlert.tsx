import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Gap } from '@/services/gapDetectionService';
import { AlertCircle, AlertTriangle, Info, XCircle, Wrench } from 'lucide-react';

interface GapAlertProps {
  gap: Gap;
  onAction?: (gap: Gap) => void;
  onDismiss?: (gap: Gap) => void;
}

export const GapAlert = ({ gap, onAction, onDismiss }: GapAlertProps) => {
  const config = {
    critical: { icon: XCircle, variant: 'destructive' as const },
    high: { icon: AlertCircle, variant: 'destructive' as const },
    medium: { icon: AlertTriangle, variant: 'default' as const },
    low: { icon: Info, variant: 'default' as const },
  };

  const { icon: Icon, variant } = config[gap.severity];

  return (
    <Alert variant={variant} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{gap.title}</span>
        <div className="flex gap-2">
          {gap.auto_fixable && onAction && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => onAction(gap)}
              className="h-7"
            >
              <Wrench className="h-3 w-3 mr-1" />
              Auto-Fix
            </Button>
          )}
          {onDismiss && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => onDismiss(gap)}
              className="h-7"
            >
              Dismiss
            </Button>
          )}
        </div>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{gap.description}</p>
        <p className="text-xs">
          <strong>Affected:</strong> {gap.affected_entity}
        </p>
        <p className="text-xs">
          <strong>Suggested Action:</strong> {gap.suggested_action}
        </p>
      </AlertDescription>
    </Alert>
  );
};
