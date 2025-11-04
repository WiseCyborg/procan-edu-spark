import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/utils/animationHelpers';
import { useRecommendationImpact } from '@/hooks/useRecommendationImpact';
import { Skeleton } from '@/components/ui/skeleton';

export const ImpactTimeline = () => {
  const { allImpacts, isLoading } = useRecommendationImpact();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Impact Timeline</CardTitle>
          <CardDescription>Loading impact history...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!allImpacts || allImpacts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Impact Timeline</CardTitle>
          <CardDescription>No impact data tracked yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start tracking the impact of implemented recommendations to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getImpactLevel = (impact: any) => {
    if (impact.roi_percentage >= 100) return 'high';
    if (impact.roi_percentage >= 50) return 'medium';
    return 'low';
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-muted-foreground bg-secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Impact Timeline</CardTitle>
        <CardDescription>
          Historical view of recommendation implementations and their measured impact
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          {/* Timeline items */}
          <div className="space-y-6">
            {allImpacts.map((impact: any) => {
              const impactLevel = getImpactLevel(impact);
              const date = new Date(impact.implementation_date);
              
              return (
                <div key={impact.id} className="relative flex gap-4">
                  {/* Timeline dot */}
                  <div className={`absolute left-6 -translate-x-1/2 h-3 w-3 rounded-full border-2 border-background ${getImpactColor(impactLevel)}`} />
                  
                  {/* Content */}
                  <div className="ml-12 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">
                            {impact.curriculum_recommendations?.title || 'Untitled Recommendation'}
                          </h4>
                          <Badge variant="outline" className="text-xs">
                            {date.toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                          <div className="flex items-center gap-2 text-sm">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-xs text-muted-foreground">Savings</div>
                              <div className="font-semibold">{formatCurrency(impact.annual_savings_usd)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Target className="h-4 w-4 text-blue-600" />
                            <div>
                              <div className="text-xs text-muted-foreground">Pass Rate</div>
                              <div className="font-semibold">+{impact.improvement_pass_rate?.toFixed(1)}%</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-purple-600" />
                            <div>
                              <div className="text-xs text-muted-foreground">ROI</div>
                              <div className="font-semibold">{impact.roi_percentage?.toFixed(0)}%</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingDown className="h-4 w-4 text-orange-600" />
                            <div>
                              <div className="text-xs text-muted-foreground">Retakes ↓</div>
                              <div className="font-semibold">{impact.retakes_prevented_annually}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge className={getImpactColor(impactLevel)}>
                        {impactLevel} impact
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};