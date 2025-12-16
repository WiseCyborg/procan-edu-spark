import { Shield, RefreshCw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCOMARCompliance } from '@/hooks/useCOMARVersion';
import { cn } from '@/lib/utils';

interface COMARStatusProps {
  variant?: 'badge' | 'compact' | 'full';
  showRefresh?: boolean;
  className?: string;
}

export const COMARStatus = ({ 
  variant = 'badge', 
  showRefresh = false,
  className 
}: COMARStatusProps) => {
  const { version, lastUpdated, isLoading, source } = useCOMARCompliance();

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric'
      })
    : 'Syncing...';

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn("flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
              <Shield className="h-3 w-3 text-green-500" />
              <span>COMAR {version}</span>
              {source === 'fallback' && (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Last updated: {formattedDate}</p>
            <p className="text-xs text-muted-foreground">Auto-refreshes hourly</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'full') {
    return (
      <div className={cn("flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg", className)}>
        <div className="relative">
          <Shield className="h-6 w-6 text-green-500" />
          <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">COMAR {version} Compliance</span>
            <Badge variant="outline" className="text-xs bg-green-500/20 border-green-500/40 text-green-700 dark:text-green-300">
              LIVE
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Last synced: {formattedDate} • Auto-updates enabled
          </p>
        </div>
        {showRefresh && (
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
        )}
      </div>
    );
  }

  // Default badge variant
  return (
    <Badge 
      variant="outline" 
      className={cn(
        "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-300",
        className
      )}
    >
      <Shield className="h-3 w-3 mr-1" />
      COMAR {version} | {formattedDate}
    </Badge>
  );
};
