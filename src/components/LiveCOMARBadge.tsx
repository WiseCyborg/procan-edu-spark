import { Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const LiveCOMARBadge = () => {
  const { data: latestCOMAR } = useQuery({
    queryKey: ['latest-comar-update'],
    queryFn: async () => {
      const { data } = await supabase
        .from('comar_versions')
        .select('effective_date')
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      return data;
    }
  });

  return (
    <div className="flex items-center justify-center gap-2 bg-green-500/20 border border-green-500/40 px-4 py-2 rounded-full max-w-fit mx-auto mb-6">
      <div className="relative">
        <Shield className="h-5 w-5 text-green-300" />
        <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-pulse" />
      </div>
      <div className="text-sm font-semibold text-white flex items-center gap-2">
        <span>COMAR 14.17 Compliance: LIVE & AUTO-UPDATING</span>
        {latestCOMAR && (
          <Badge variant="outline" className="text-xs border-white/40 text-white/90">
            Last Updated: {new Date(latestCOMAR.effective_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Badge>
        )}
      </div>
    </div>
  );
};
