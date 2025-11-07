import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { GapSeverity } from '@/services/gapDetectionService';
import { AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

interface GapBadgeProps {
  severity: GapSeverity;
  count?: number;
  showIcon?: boolean;
  className?: string;
}

export const GapBadge = ({ severity, count, showIcon = true, className }: GapBadgeProps) => {
  const config = {
    critical: {
      variant: 'destructive' as const,
      icon: XCircle,
      label: 'Critical',
      color: 'text-destructive',
    },
    high: {
      variant: 'destructive' as const,
      icon: AlertCircle,
      label: 'High',
      color: 'text-orange-600 dark:text-orange-400',
    },
    medium: {
      variant: 'secondary' as const,
      icon: AlertTriangle,
      label: 'Medium',
      color: 'text-yellow-600 dark:text-yellow-400',
    },
    low: {
      variant: 'outline' as const,
      icon: Info,
      label: 'Low',
      color: 'text-blue-600 dark:text-blue-400',
    },
  };

  const { variant, icon: Icon, label, color } = config[severity];

  return (
    <Badge variant={variant} className={cn('gap-1', className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{label}</span>
      {count !== undefined && <span className="font-bold">({count})</span>}
    </Badge>
  );
};
