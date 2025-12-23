import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Grid3X3 } from 'lucide-react';

interface ComplianceHealth {
  organization_id: string;
  organization_name: string;
  total_employees: number;
  certified_employees: number;
  working_uncertified: number;
  pending_retraining: number;
  overdue_reviews: number;
  missing_signoffs: number;
  compliance_status: string;
  certification_rate: number;
}

export const ComplianceRiskHeatmap = () => {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['pipeline-compliance-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_pipeline_compliance_health')
        .select('*')
        .order('certification_rate', { ascending: true });

      if (error) throw error;
      return data as ComplianceHealth[];
    },
    refetchInterval: 60000,
  });

  const getRiskColor = (org: ComplianceHealth) => {
    // Calculate a risk score based on multiple factors
    let riskScore = 0;
    
    // Certification rate (lower is worse)
    riskScore += (100 - org.certification_rate) * 0.4;
    
    // Working uncertified (very bad)
    riskScore += org.working_uncertified * 20;
    
    // Pending retraining
    riskScore += org.pending_retraining * 10;
    
    // Overdue reviews
    riskScore += org.overdue_reviews * 15;
    
    // Missing signoffs
    riskScore += org.missing_signoffs * 5;

    // Normalize to 0-100
    const normalizedScore = Math.min(100, riskScore);

    // Return color based on score
    if (normalizedScore >= 60) {
      return 'bg-red-500 hover:bg-red-600';
    } else if (normalizedScore >= 30) {
      return 'bg-yellow-500 hover:bg-yellow-600';
    } else if (normalizedScore > 0) {
      return 'bg-green-400 hover:bg-green-500';
    }
    return 'bg-green-500 hover:bg-green-600';
  };

  const getRiskLabel = (org: ComplianceHealth) => {
    if (org.working_uncertified > 0) return 'Critical';
    if (org.pending_retraining > 0 || org.overdue_reviews > 0) return 'At Risk';
    if (org.certification_rate < 100) return 'Monitor';
    return 'Healthy';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Compliance Risk Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading heatmap...</p>
        </CardContent>
      </Card>
    );
  }

  if (!healthData || healthData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            Compliance Risk Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No organizations to display</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate grid dimensions
  const columns = Math.ceil(Math.sqrt(healthData.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          Compliance Risk Heatmap
        </CardTitle>
        <CardDescription>
          Visual overview of compliance risk across organizations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div 
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {healthData.map((org) => (
              <Tooltip key={org.organization_id}>
                <TooltipTrigger asChild>
                  <div 
                    className={`aspect-square rounded cursor-pointer transition-colors ${getRiskColor(org)}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{org.organization_name}</p>
                    <p className="text-sm">Status: {getRiskLabel(org)}</p>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Certification Rate: {org.certification_rate}%</p>
                      <p>Employees: {org.certified_employees}/{org.total_employees} certified</p>
                      {org.working_uncertified > 0 && (
                        <p className="text-red-400">⚠ {org.working_uncertified} working uncertified</p>
                      )}
                      {org.pending_retraining > 0 && (
                        <p className="text-yellow-400">⟳ {org.pending_retraining} pending retraining</p>
                      )}
                      {org.overdue_reviews > 0 && (
                        <p className="text-yellow-400">📅 {org.overdue_reviews} overdue reviews</p>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500" />
            <span className="text-xs text-muted-foreground">Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-400" />
            <span className="text-xs text-muted-foreground">Monitor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500" />
            <span className="text-xs text-muted-foreground">At Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500" />
            <span className="text-xs text-muted-foreground">Critical</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
