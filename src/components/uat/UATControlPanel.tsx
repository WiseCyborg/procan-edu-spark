import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  PlayCircle, 
  Mail, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Settings,
  ListTodo,
  Loader2,
  Power
} from 'lucide-react';

interface UATRun {
  id: string;
  run_code: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  summary_metrics: Record<string, number>;
}

interface UATControlPanelProps {
  organizationId?: string;
}

export const UATControlPanel: React.FC<UATControlPanelProps> = ({ organizationId }) => {
  const { user } = useAuth();
  const [uatEnabled, setUatEnabled] = useState(false);
  const [uatEmail, setUatEmail] = useState('');
  const [currentRun, setCurrentRun] = useState<UATRun | null>(null);
  const [taskStats, setTaskStats] = useState({ todo: 0, doing: 0, done: 0, blocked: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (organizationId) {
      fetchUATSettings();
    }
  }, [organizationId]);

  const fetchUATSettings = async () => {
    if (!organizationId) return;
    
    setIsLoading(true);
    try {
      // Fetch organization UAT settings
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('uat_enabled, uat_email, current_uat_run_id')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      setUatEnabled(org?.uat_enabled || false);
      setUatEmail(org?.uat_email || user?.email || '');

      // Fetch current run if exists
      if (org?.current_uat_run_id) {
        const { data: run } = await supabase
          .from('uat_runs')
          .select('*')
          .eq('id', org.current_uat_run_id)
          .single();

        if (run) {
          setCurrentRun(run as UATRun);
          await fetchTaskStats(run.id);
        }
      }
    } catch (error) {
      console.error('Error fetching UAT settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaskStats = async (runId: string) => {
    const { data: tasks } = await supabase
      .from('uat_tasks')
      .select('status')
      .eq('run_id', runId);

    if (tasks) {
      const stats = { todo: 0, doing: 0, done: 0, blocked: 0, total: tasks.length };
      tasks.forEach(t => {
        if (t.status === 'todo') stats.todo++;
        else if (t.status === 'doing') stats.doing++;
        else if (t.status === 'done') stats.done++;
        else if (t.status === 'blocked') stats.blocked++;
      });
      setTaskStats(stats);
    }
  };

  const handleToggleUAT = async (enabled: boolean) => {
    if (!organizationId) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ uat_enabled: enabled, uat_email: uatEmail || null })
        .eq('id', organizationId);

      if (error) throw error;

      setUatEnabled(enabled);
      toast({
        title: enabled ? 'UAT Mode Enabled' : 'UAT Mode Disabled',
        description: enabled 
          ? 'UAT testing features are now active for this organization'
          : 'UAT testing features have been disabled',
      });
    } catch (error) {
      console.error('Error toggling UAT:', error);
      toast({
        title: 'Error',
        description: 'Failed to update UAT settings',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateEmail = async () => {
    if (!organizationId) return;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ uat_email: uatEmail })
        .eq('id', organizationId);

      if (error) throw error;

      toast({
        title: 'Email Updated',
        description: 'UAT notifications will be sent to ' + uatEmail,
      });
    } catch (error) {
      console.error('Error updating UAT email:', error);
      toast({
        title: 'Error',
        description: 'Failed to update UAT email',
        variant: 'destructive',
      });
    }
  };

  const handleStartNewRun = async () => {
    if (!organizationId || !user?.id) return;

    setIsStarting(true);
    try {
      // Generate run code (e.g., "UAT-20251223-001")
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const { count } = await supabase
        .from('uat_runs')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId);
      
      const runNumber = String((count || 0) + 1).padStart(3, '0');
      const runCode = `UAT-${date}-${runNumber}`;

      // Create new run
      const { data: newRun, error: runError } = await supabase
        .from('uat_runs')
        .insert({
          organization_id: organizationId,
          run_code: runCode,
          started_by: user.id,
          status: 'active',
        })
        .select()
        .single();

      if (runError) throw runError;

      // Update organization with current run
      await supabase
        .from('organizations')
        .update({ current_uat_run_id: newRun.id })
        .eq('id', organizationId);

      setCurrentRun(newRun as UATRun);

      // Auto-generate tasks
      await handleGenerateTasks(newRun.id);

      toast({
        title: 'UAT Run Started',
        description: `Run ${runCode} has been created with 12 test tasks`,
      });
    } catch (error) {
      console.error('Error starting UAT run:', error);
      toast({
        title: 'Error',
        description: 'Failed to start UAT run',
        variant: 'destructive',
      });
    } finally {
      setIsStarting(false);
    }
  };

  const handleGenerateTasks = async (runId?: string) => {
    const targetRunId = runId || currentRun?.id;
    if (!targetRunId || !organizationId) return;

    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-uat-tasks', {
        body: { runId: targetRunId, organizationId },
      });

      if (error) throw error;

      await fetchTaskStats(targetRunId);
      
      if (!runId) {
        toast({
          title: 'Tasks Generated',
          description: 'UAT task list has been refreshed',
        });
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate UAT tasks',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendDigest = async () => {
    if (!currentRun?.id || !uatEmail) return;

    setIsSendingEmail(true);
    try {
      const { error } = await supabase.functions.invoke('send-uat-digest', {
        body: { 
          runId: currentRun.id, 
          email: uatEmail,
          organizationId 
        },
      });

      if (error) throw error;

      toast({
        title: 'Digest Sent',
        description: `UAT task digest sent to ${uatEmail}`,
      });
    } catch (error) {
      console.error('Error sending digest:', error);
      toast({
        title: 'Error',
        description: 'Failed to send UAT digest email',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCompleteRun = async () => {
    if (!currentRun?.id || !organizationId) return;

    try {
      await supabase
        .from('uat_runs')
        .update({ 
          status: 'completed', 
          completed_at: new Date().toISOString(),
          summary_metrics: taskStats
        })
        .eq('id', currentRun.id);

      await supabase
        .from('organizations')
        .update({ current_uat_run_id: null })
        .eq('id', organizationId);

      toast({
        title: 'UAT Run Completed',
        description: `Run ${currentRun.run_code} has been marked as complete`,
      });

      setCurrentRun(null);
      setTaskStats({ todo: 0, doing: 0, done: 0, blocked: 0, total: 0 });
    } catch (error) {
      console.error('Error completing run:', error);
      toast({
        title: 'Error',
        description: 'Failed to complete UAT run',
        variant: 'destructive',
      });
    }
  };

  const progressPercent = taskStats.total > 0 
    ? Math.round((taskStats.done / taskStats.total) * 100) 
    : 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* UAT Mode Toggle Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Settings className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>UAT Mode Control</CardTitle>
                <CardDescription>
                  Enable User Acceptance Testing features for this organization
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={uatEnabled}
                onCheckedChange={handleToggleUAT}
                aria-label="Toggle UAT Mode"
              />
              <Badge variant={uatEnabled ? 'default' : 'secondary'}>
                {uatEnabled ? 'ENABLED' : 'DISABLED'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="uat-email">UAT Notification Email</Label>
              <Input
                id="uat-email"
                type="email"
                placeholder="uat-team@example.com"
                value={uatEmail}
                onChange={(e) => setUatEmail(e.target.value)}
                disabled={!uatEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                All UAT notifications and digests will be sent to this email
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleUpdateEmail}
              disabled={!uatEnabled || !uatEmail}
            >
              Save Email
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Run Status Card */}
      {uatEnabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ListTodo className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>
                    {currentRun ? `Current Run: ${currentRun.run_code}` : 'No Active Run'}
                  </CardTitle>
                  <CardDescription>
                    {currentRun 
                      ? `Started ${new Date(currentRun.started_at).toLocaleDateString()}`
                      : 'Start a new UAT run to begin testing'
                    }
                  </CardDescription>
                </div>
              </div>
              {currentRun && (
                <Badge 
                  variant={currentRun.status === 'active' ? 'default' : 'secondary'}
                  className="uppercase"
                >
                  {currentRun.status}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentRun ? (
              <>
                {/* Progress Overview */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{taskStats.done} / {taskStats.total} tasks complete</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Task Status Badges */}
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{taskStats.todo} Todo</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <RefreshCw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">{taskStats.doing} In Progress</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">{taskStats.done} Done</span>
                  </div>
                  {taskStats.blocked > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium">{taskStats.blocked} Blocked</span>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateTasks()}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Regenerate Tasks
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleSendDigest}
                    disabled={isSendingEmail || !uatEmail}
                  >
                    {isSendingEmail ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4 mr-2" />
                    )}
                    Send Today's Tasks Email
                  </Button>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Evidence Bundle
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCompleteRun}
                    disabled={taskStats.done < taskStats.total}
                  >
                    <Power className="h-4 w-4 mr-2" />
                    Complete Run
                  </Button>
                </div>
              </>
            ) : (
              <Button 
                onClick={handleStartNewRun} 
                disabled={isStarting}
                className="w-full"
                size="lg"
              >
                {isStarting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4 mr-2" />
                )}
                Start New UAT Run
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
