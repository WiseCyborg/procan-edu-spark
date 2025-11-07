import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { detectAllGaps, getGapSummary, GapCategory } from '@/services/gapDetectionService';
import { GapBadge } from './GapBadge';
import { GapScoreCard } from './GapScoreCard';
import { AlertTriangle, CheckCircle, FileCheck, Users, Activity, Database, DollarSign, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UnifiedGapOverviewProps {
  onCategoryClick?: (category: GapCategory) => void;
}

export const UnifiedGapOverview = ({ onCategoryClick }: UnifiedGapOverviewProps) => {
  const { data: gaps, isLoading } = useQuery({
    queryKey: ['unified-gaps'],
    queryFn: detectAllGaps,
    refetchInterval: 60000, // Refresh every minute
  });

  const summary = gaps ? getGapSummary(gaps) : null;

  const categoryConfig: Record<GapCategory, { icon: any; label: string; color: string }> = {
    compliance: { icon: FileCheck, label: 'Compliance', color: 'text-blue-600' },
    training: { icon: Users, label: 'Training', color: 'text-purple-600' },
    system: { icon: Settings, label: 'System', color: 'text-gray-600' },
    engagement: { icon: Activity, label: 'Engagement', color: 'text-green-600' },
    data: { icon: Database, label: 'Data Quality', color: 'text-orange-600' },
    payment: { icon: DollarSign, label: 'Payment', color: 'text-yellow-600' },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) return null;

  const hasGaps = summary.total > 0;

  return (
    <div className="space-y-4">
      {/* Overall Health Score */}
      <Card className={hasGaps ? 'border-destructive' : 'border-green-600'}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasGaps ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <span>System Gap Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Overall Score:</span>
              <span className={`text-2xl font-bold ${summary.score >= 90 ? 'text-green-600' : summary.score >= 75 ? 'text-yellow-600' : 'text-destructive'}`}>
                {summary.score}
              </span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasGaps ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total Gaps:</span>
                  <span className="text-2xl font-bold">{summary.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GapBadge severity="critical" count={summary.critical} />
                  <GapBadge severity="high" count={summary.high} />
                  <GapBadge severity="medium" count={summary.medium} />
                  <GapBadge severity="low" count={summary.low} />
                </div>
              </div>
              
              {/* Category Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {(Object.entries(categoryConfig) as [GapCategory, typeof categoryConfig[GapCategory]][]).map(([category, config]) => {
                  const count = summary.byCategory[category];
                  const Icon = config.icon;
                  
                  return (
                    <Button
                      key={category}
                      variant={count > 0 ? 'outline' : 'ghost'}
                      className="h-auto flex-col items-start p-4 space-y-2"
                      onClick={() => onCategoryClick?.(category)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="text-xs font-medium">{config.label}</span>
                      </div>
                      <div className="text-2xl font-bold w-full text-left">
                        {count}
                      </div>
                      {count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {count === 1 ? 'gap' : 'gaps'}
                        </span>
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Gaps Detected</h3>
              <p className="text-sm text-muted-foreground">
                All systems are operating within acceptable parameters
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Health Scores */}
      {hasGaps && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(Object.entries(summary.byCategory) as [GapCategory, number][]).map(([category, count]) => {
            if (count === 0) return null;
            const categoryGaps = gaps?.filter(g => g.category === category) || [];
            const categoryScore = 100 - categoryGaps.reduce((sum, g) => {
              const weights = { critical: 10, high: 5, medium: 2, low: 1 };
              return sum + weights[g.severity];
            }, 0);
            
            return (
              <GapScoreCard
                key={category}
                score={Math.max(0, categoryScore)}
                category={category}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
