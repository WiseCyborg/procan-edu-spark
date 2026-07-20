import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, AlertCircle, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CompletionStats {
  totalEmployees: number;
  completedCount: number;
  averageProgress: number;
  averageScore: number;
  atRiskCount: number;
}

interface CompletionAnalyticsWidgetProps {
  organizationId: string;
}

export function CompletionAnalyticsWidget({ organizationId }: CompletionAnalyticsWidgetProps) {
  const [stats, setStats] = useState<CompletionStats>({
    totalEmployees: 0,
    completedCount: 0,
    averageProgress: 0,
    averageScore: 0,
    atRiskCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletionStats();
  }, [organizationId]);

  const fetchCompletionStats = async () => {
    try {
      // Get at-risk students
      const { data: atRisk, error: riskError } = await supabase
        .rpc("get_at_risk_students" as any, { org_id: organizationId });

      if (riskError) throw riskError;

      const atRiskArray = Array.isArray(atRisk) ? atRisk : [];

      setStats({
        totalEmployees: 0,
        completedCount: 0,
        averageProgress: 0,
        averageScore: 0,
        atRiskCount: atRiskArray.length
      });
    } catch (error) {
      console.error("Error fetching completion stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const completionRate = stats.totalEmployees > 0 
    ? Math.round((stats.completedCount / stats.totalEmployees) * 100) 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Completion Analytics
        </CardTitle>
        <CardDescription>Track training progress and performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Overall Completion Rate</span>
                <span className="font-medium">{completionRate}%</span>
              </div>
              <Progress value={completionRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.completedCount} of {stats.totalEmployees} employees completed
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  Avg Progress
                </div>
                <p className="text-2xl font-bold">{stats.averageProgress}%</p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  In Progress
                </div>
                <p className="text-2xl font-bold">
                  {stats.totalEmployees - stats.completedCount}
                </p>
              </div>
            </div>

            {stats.atRiskCount > 0 && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="text-sm font-medium text-red-900 dark:text-red-100">
                      {stats.atRiskCount} Employee{stats.atRiskCount > 1 ? 's' : ''} At Risk
                    </p>
                    <p className="text-xs text-red-800 dark:text-red-200">
                      Deadline approaching within 7 days
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">Deadline Compliance</span>
              <Badge variant={stats.atRiskCount === 0 ? "default" : "destructive"}>
                {stats.atRiskCount === 0 ? "On Track" : "Action Needed"}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
