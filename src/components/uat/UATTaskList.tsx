import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  AlertTriangle,
  Loader2,
  User,
  ClipboardCheck,
  XCircle
} from 'lucide-react';

interface UATTask {
  id: string;
  task_code: string;
  title: string;
  description: string | null;
  role_to_test: string | null;
  deep_link: string | null;
  expected_result: string | null;
  status: string;
  evidence: string | null;
  priority: number;
  completed_at: string | null;
}

interface UATTaskListProps {
  runId?: string;
  organizationId?: string;
  onTaskUpdate?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  todo: { label: 'To Do', icon: Clock, color: 'bg-muted text-muted-foreground' },
  doing: { label: 'In Progress', icon: PlayCircle, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  done: { label: 'Complete', icon: CheckCircle2, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  blocked: { label: 'Blocked', icon: AlertTriangle, color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  skipped: { label: 'Skipped', icon: XCircle, color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const ROLE_COLORS: Record<string, string> = {
  employee: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  compliance_manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  dispensary_manager: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  training_coordinator: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export const UATTaskList: React.FC<UATTaskListProps> = ({ runId, organizationId, onTaskUpdate }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<UATTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<UATTask | null>(null);
  const [evidence, setEvidence] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, [runId]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('uat_tasks')
        .select('*')
        .eq('run_id', runId)
        .order('priority', { ascending: false })
        .order('task_code');

      if (error) throw error;
      setTasks(data as UATTask[]);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load UAT tasks',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setIsUpdating(true);
    try {
      const updates: Record<string, unknown> = { 
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'done') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = user?.id;
        if (evidence) {
          updates.evidence = evidence;
        }
      }

      const { error } = await supabase
        .from('uat_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      await fetchTasks();
      setSelectedTask(null);
      setEvidence('');
      onTaskUpdate?.();

      toast({
        title: 'Task Updated',
        description: `Task marked as ${STATUS_CONFIG[newStatus].label}`,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const openDeepLink = (link: string) => {
    window.open(link, '_blank');
  };

  const filteredTasks = filter === 'all' 
    ? tasks 
    : tasks.filter(t => t.status === filter);

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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              UAT Tasks ({tasks.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({tasks.length})</TabsTrigger>
              <TabsTrigger value="todo">To Do ({tasks.filter(t => t.status === 'todo').length})</TabsTrigger>
              <TabsTrigger value="doing">In Progress ({tasks.filter(t => t.status === 'doing').length})</TabsTrigger>
              <TabsTrigger value="done">Done ({tasks.filter(t => t.status === 'done').length})</TabsTrigger>
              <TabsTrigger value="blocked">Blocked ({tasks.filter(t => t.status === 'blocked').length})</TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="space-y-3">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks in this category
                </div>
              ) : (
                filteredTasks.map((task) => {
                  const StatusIcon = STATUS_CONFIG[task.status]?.icon || Clock;
                  return (
                    <div
                      key={task.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedTask(task);
                        setEvidence(task.evidence || '');
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="font-mono text-xs">
                              {task.task_code}
                            </Badge>
                            {task.role_to_test && (
                              <Badge className={ROLE_COLORS[task.role_to_test] || 'bg-muted'}>
                                <User className="h-3 w-3 mr-1" />
                                {task.role_to_test.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium">{task.title}</h4>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.deep_link && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeepLink(task.deep_link!);
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                          <Badge className={STATUS_CONFIG[task.status]?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {STATUS_CONFIG[task.status]?.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                {selectedTask?.task_code}
              </Badge>
              {selectedTask?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedTask?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Role and Link */}
            <div className="flex items-center gap-4">
              {selectedTask?.role_to_test && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Test as:</span>
                  <Badge className={ROLE_COLORS[selectedTask.role_to_test] || 'bg-muted'}>
                    <User className="h-3 w-3 mr-1" />
                    {selectedTask.role_to_test.replace('_', ' ')}
                  </Badge>
                </div>
              )}
              {selectedTask?.deep_link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDeepLink(selectedTask.deep_link!)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Test Page
                </Button>
              )}
            </div>

            {/* Expected Result */}
            {selectedTask?.expected_result && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Expected Result</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedTask.expected_result}
                </p>
              </div>
            )}

            {/* Evidence Input */}
            <div>
              <h4 className="font-medium text-sm mb-2">Evidence / Notes</h4>
              <Textarea
                placeholder="Document what you observed, any issues found, or confirmation that the feature works as expected..."
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Button
                variant="outline"
                onClick={() => handleStatusChange(selectedTask!.id, 'todo')}
                disabled={isUpdating || selectedTask?.status === 'todo'}
              >
                <Clock className="h-4 w-4 mr-2" />
                To Do
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange(selectedTask!.id, 'doing')}
                disabled={isUpdating || selectedTask?.status === 'doing'}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                In Progress
              </Button>
              <Button
                variant="outline"
                className="text-red-600"
                onClick={() => handleStatusChange(selectedTask!.id, 'blocked')}
                disabled={isUpdating || selectedTask?.status === 'blocked'}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Blocked
              </Button>
            </div>
            <Button
              onClick={() => handleStatusChange(selectedTask!.id, 'done')}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
