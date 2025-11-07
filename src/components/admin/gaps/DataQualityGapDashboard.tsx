import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { detectDataQualityGaps } from '@/services/gapDetectionService';
import { GapAlert } from './GapAlert';
import { Progress } from '@/components/ui/progress';
import { Database, Users, Building, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export const DataQualityGapDashboard = () => {
  const { data: gaps, isLoading } = useQuery({
    queryKey: ['data-quality-gaps'],
    queryFn: detectDataQualityGaps,
    refetchInterval: 180000, // Refresh every 3 minutes
  });

  const handleFixData = (gap: any) => {
    toast.success('Fix initiated', {
      description: `Data quality fix started for ${gap.affected_entity}`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Quality Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gaps || gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Quality Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Data Quality Excellent</h3>
            <p className="text-sm text-muted-foreground">
              All profiles and organizations have complete data
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const profileGaps = gaps.filter(g => g.title.includes('Profile'));
  const orgGaps = gaps.filter(g => g.title.includes('Organization'));
  const completionRate = Math.round(100 - (gaps.length / 10)); // Simplified calculation

  return (
    <div className="space-y-6">
      {/* Data Quality Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Completeness Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{completionRate}%</span>
              <Badge variant={completionRate >= 90 ? 'default' : completionRate >= 75 ? 'secondary' : 'destructive'}>
                {completionRate >= 90 ? 'Excellent' : completionRate >= 75 ? 'Good' : 'Needs Work'}
              </Badge>
            </div>
            <Progress value={completionRate} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {gaps.length} data quality {gaps.length === 1 ? 'issue' : 'issues'} detected
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gap Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incomplete Profiles</p>
                <p className="text-3xl font-bold">{profileGaps.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Incomplete Organizations</p>
                <p className="text-3xl font-bold">{orgGaps.length}</p>
              </div>
              <Building className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profile Gaps */}
      {profileGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Incomplete User Profiles ({profileGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profileGaps.slice(0, 5).map(gap => (
                <GapAlert
                  key={gap.id}
                  gap={gap}
                  onAction={handleFixData}
                />
              ))}
              {profileGaps.length > 5 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  + {profileGaps.length - 5} more incomplete profiles
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Organization Gaps */}
      {orgGaps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-purple-600" />
              Incomplete Organization Data ({orgGaps.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {orgGaps.map(gap => (
                <GapAlert
                  key={gap.id}
                  gap={gap}
                  onAction={handleFixData}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
