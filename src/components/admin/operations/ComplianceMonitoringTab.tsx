import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle2, Clock, Play, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ModuleNeedingReview {
  module_id: string;
  module_number: number;
  module_title: string;
  last_reviewed_at: string | null;
  days_overdue: number;
  comar_reference: string;
}

export const ComplianceMonitoringTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState<ModuleNeedingReview | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: modulesNeedingReview, isLoading } = useQuery({
    queryKey: ['modules-needing-review'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_modules_needing_review');
      if (error) throw error;
      return data as ModuleNeedingReview[];
    },
  });

  const runCheckMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-comar-compliance');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Compliance Check Complete',
        description: `Checked ${data.modules_checked} modules, created ${data.reviews_created} review items`,
      });
      queryClient.invalidateQueries({ queryKey: ['modules-needing-review'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Check Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const markReviewedMutation = useMutation({
    mutationFn: async ({ moduleId, notes }: { moduleId: string; notes: string }) => {
      const { data, error } = await supabase.rpc('mark_module_reviewed', {
        p_module_id: moduleId,
        p_review_notes: notes,
        p_compliance_status: 'compliant',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Module Marked as Reviewed',
        description: 'Next review due in 6 months',
      });
      setSelectedModule(null);
      setReviewNotes('');
      queryClient.invalidateQueries({ queryKey: ['modules-needing-review'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Review Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getUrgencyBadge = (daysOverdue: number) => {
    if (daysOverdue > 30) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          CRITICAL ({daysOverdue}d overdue)
        </Badge>
      );
    }
    if (daysOverdue > 14) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          HIGH ({daysOverdue}d overdue)
        </Badge>
      );
    }
    if (daysOverdue > 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Due ({daysOverdue}d overdue)
        </Badge>
      );
    }
    return <Badge variant="outline">Due Soon</Badge>;
  };

  const criticalCount = modulesNeedingReview?.filter(m => m.days_overdue > 30).length || 0;
  const totalOverdue = modulesNeedingReview?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            COMAR Compliance Monitoring
          </h2>
          <p className="text-muted-foreground mt-1">
            Automated 6-month review system for regulatory compliance
          </p>
        </div>
        <Button 
          onClick={() => runCheckMutation.mutate()}
          disabled={runCheckMutation.isPending}
          className="flex items-center gap-2"
        >
          <Play className="h-4 w-4" />
          Run Compliance Check
        </Button>
      </div>

      {criticalCount > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalCount} modules</strong> are critically overdue for compliance review ({'>'}30 days)
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Overdue</p>
              <p className="text-3xl font-bold">{totalOverdue}</p>
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Up to Date</p>
              <p className="text-3xl font-bold text-green-600">
                {23 - totalOverdue}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Modules Requiring Review</h3>
          
          {isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : totalOverdue === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-medium">All modules are up to date!</p>
              <p className="text-sm text-muted-foreground mt-1">
                All course modules are within their 6-month compliance window
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Module</TableHead>
                  <TableHead>COMAR Reference</TableHead>
                  <TableHead>Last Reviewed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modulesNeedingReview?.map((module) => (
                  <TableRow key={module.module_id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">Module {module.module_number}</p>
                        <p className="text-sm text-muted-foreground">{module.module_title}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{module.comar_reference}</TableCell>
                    <TableCell>
                      {module.last_reviewed_at 
                        ? new Date(module.last_reviewed_at).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>{getUrgencyBadge(module.days_overdue)}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedModule(module)}
                          >
                            Mark Reviewed
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mark Module as Reviewed</DialogTitle>
                            <DialogDescription>
                              Module {module.module_number}: {module.module_title}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Review Notes</label>
                              <Textarea
                                placeholder="Document what was reviewed and any changes made..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                                className="mt-2"
                                rows={4}
                              />
                            </div>
                            <Button
                              onClick={() => {
                                if (selectedModule) {
                                  markReviewedMutation.mutate({
                                    moduleId: selectedModule.module_id,
                                    notes: reviewNotes,
                                  });
                                }
                              }}
                              disabled={markReviewedMutation.isPending}
                              className="w-full"
                            >
                              Confirm Review Complete
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
};
