import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FunctionStatus {
  function_name: string;
  is_deployed: boolean;
  response_time_ms: number | null;
  error_message: string | null;
  last_check: string;
}

export const EdgeFunctionsStatus = () => {
  const [functions, setFunctions] = useState<FunctionStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFunctionStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('edge_function_status')
        .select('*')
        .order('function_name');

      if (error) throw error;
      setFunctions(data || []);
    } catch (error) {
      toast({
        title: "Failed to fetch function status",
        description: "Unable to retrieve edge function deployment data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFunctionStatus();
  }, []);

  const deployedCount = functions.filter(f => f.is_deployed).length;
  const totalCount = functions.length;
  const deploymentRate = totalCount > 0 ? (deployedCount / totalCount * 100).toFixed(1) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edge Functions Status</CardTitle>
            <CardDescription>
              {deployedCount} of {totalCount} functions deployed ({deploymentRate}%)
            </CardDescription>
          </div>
          <Button onClick={fetchFunctionStatus} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {functions.map((func) => (
            <div key={func.function_name} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {func.is_deployed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <div>
                  <div className="font-medium text-sm">{func.function_name}</div>
                  {func.response_time_ms && (
                    <div className="text-xs text-muted-foreground">
                      Response: {func.response_time_ms}ms
                    </div>
                  )}
                  {func.error_message && (
                    <div className="text-xs text-red-600">{func.error_message}</div>
                  )}
                </div>
              </div>
              <Badge variant={func.is_deployed ? "default" : "destructive"}>
                {func.is_deployed ? "Deployed" : "Failed"}
              </Badge>
            </div>
          ))}
          {functions.length === 0 && !loading && (
            <div className="text-center py-8 text-muted-foreground">
              No function status data available
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
