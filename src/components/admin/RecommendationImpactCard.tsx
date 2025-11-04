import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, DollarSign, Target, Clock } from 'lucide-react';
import { formatCurrency } from '@/utils/animationHelpers';

interface RecommendationImpactCardProps {
  recommendation: any;
  impact?: any;
  onCalculateImpact?: () => void;
}

export const RecommendationImpactCard = ({ 
  recommendation, 
  impact,
  onCalculateImpact 
}: RecommendationImpactCardProps) => {
  const hasImpact = impact && recommendation.tracked_impact;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{recommendation.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant={
                recommendation.priority === 'critical' ? 'destructive' :
                recommendation.priority === 'high' ? 'default' :
                'secondary'
              }>
                {recommendation.priority}
              </Badge>
              <Badge variant="outline">{recommendation.status}</Badge>
              {hasImpact && (
                <Badge variant="default" className="bg-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Tracked
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {recommendation.description}
        </p>

        {hasImpact ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-xs text-muted-foreground">Annual Savings</div>
                <div className="font-semibold">{formatCurrency(impact.annual_savings_usd)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-xs text-muted-foreground">Pass Rate ↑</div>
                <div className="font-semibold">+{impact.improvement_pass_rate?.toFixed(1)}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-xs text-muted-foreground">ROI</div>
                <div className="font-semibold">{impact.roi_percentage?.toFixed(0)}%</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-secondary/30 rounded">
              <Clock className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-xs text-muted-foreground">Hours Saved</div>
                <div className="font-semibold">{Math.round(impact.estimated_hours_saved_annually)}h/yr</div>
              </div>
            </div>
          </div>
        ) : (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onCalculateImpact}
          >
            Calculate Impact
          </Button>
        )}
      </CardContent>
    </Card>
  );
};