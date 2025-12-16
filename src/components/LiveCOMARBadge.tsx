import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCOMARCompliance } from '@/hooks/useCOMARVersion';

export const LiveCOMARBadge = () => {
  const { version, lastUpdated, isLoading, source } = useCOMARCompliance();

  const formattedDate = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/40 px-4 py-2 rounded-full max-w-fit mx-auto mb-6">
      <div className="relative">
        <Shield className="h-5 w-5 text-green-300" />
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
      </div>
      <div className="text-sm font-semibold text-white flex items-center gap-2">
        <span>COMAR {version} Compliance: LIVE & AUTO-UPDATING</span>
        {!isLoading && formattedDate && (
          <Badge variant="outline" className="text-xs border-white/40 text-white/90">
            Last Updated: {formattedDate}
          </Badge>
        )}
        {source === 'fallback' && (
          <Badge variant="outline" className="text-xs border-amber-400/40 text-amber-300">
            Syncing...
          </Badge>
        )}
      </div>
    </div>
  );
};
