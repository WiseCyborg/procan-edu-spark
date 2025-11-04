import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Sparkles, CheckCircle, XCircle, Clock, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import { OptimizerScheduleCard } from './OptimizerScheduleCard';

interface Recommendation {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  title: string;
  description: string;
  rationale: string;
  estimated_effort: string;
  impact: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  related_sections: number[];
  data_source: {
    specific_actions?: string[];
    analytics_snapshot?: any;
  };
  created_at: string;
  reviewed_at?: string;
}

export const AIContentOptimizer: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['curriculum-recommendations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('curriculum_recommendations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Recommendation[];
    },
  });

  const runAnalysisMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ai-content-optimizer');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Generated ${data.saved_count} recommendations`);
      queryClient.invalidateQueries({ queryKey: ['curriculum-recommendations'] });
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('curriculum_recommendations')
        .update({ 
          status, 
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['curriculum-recommendations'] });
      toast.success('Status updated');
    },
  });

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      await runAnalysisMutation.mutateAsync();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'in_progress': return <Clock className="h-4 w-4 text-warning" />;
      default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingRecs = recommendations?.filter(r => r.status === 'pending') || [];
  const inProgressRecs = recommendations?.filter(r => r.status === 'in_progress') || [];
  const completedRecs = recommendations?.filter(r => r.status === 'completed') || [];

  return (
    <div className="space-y-6">
      <OptimizerScheduleCard />
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Content Optimizer
              </CardTitle>
              <CardDescription>
                Automatically analyze exam performance and recommend content improvements
              </CardDescription>
            </div>
            <Button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingRecs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressRecs.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedRecs.length}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">Pending ({pendingRecs.length})</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress ({inProgressRecs.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedRecs.length})</TabsTrigger>
              <TabsTrigger value="all">All ({recommendations?.length || 0})</TabsTrigger>
            </TabsList>

            {['pending', 'in_progress', 'completed', 'all'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4 mt-4">
                {isLoading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    {(tab === 'all' ? recommendations : 
                      tab === 'pending' ? pendingRecs :
                      tab === 'in_progress' ? inProgressRecs :
                      completedRecs)?.map((rec) => (
                      <Card key={rec.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(rec.status)}
                                <CardTitle className="text-lg">{rec.title}</CardTitle>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant={getPriorityColor(rec.priority)}>
                                  {rec.priority}
                                </Badge>
                                {rec.related_sections?.length > 0 && (
                                  <Badge variant="outline">
                                    Sections: {rec.related_sections.join(', ')}
                                  </Badge>
                                )}
                                <span className="text-sm text-muted-foreground">
                                  {rec.estimated_effort}
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-1">Description</h4>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-1">Rationale</h4>
                            <p className="text-sm text-muted-foreground">{rec.rationale}</p>
                          </div>

                          <div>
                            <h4 className="font-medium mb-1">Expected Impact</h4>
                            <p className="text-sm text-success font-medium">{rec.impact}</p>
                          </div>

                          {rec.data_source?.specific_actions && rec.data_source.specific_actions.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2">Specific Actions</h4>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                {rec.data_source.specific_actions.map((action, idx) => (
                                  <li key={idx}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {rec.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ 
                                    id: rec.id, 
                                    status: 'in_progress' 
                                  })}
                                >
                                  Start Work
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ 
                                    id: rec.id, 
                                    status: 'rejected' 
                                  })}
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                            {rec.status === 'in_progress' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateStatusMutation.mutate({ 
                                    id: rec.id, 
                                    status: 'completed' 
                                  })}
                                >
                                  Mark Complete
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateStatusMutation.mutate({ 
                                    id: rec.id, 
                                    status: 'pending' 
                                  })}
                                >
                                  Back to Pending
                                </Button>
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
