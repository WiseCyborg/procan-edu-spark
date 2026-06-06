import { useMemo } from 'react';
import { useUATRun } from '@/hooks/useUATRun';
import { UATStepCard } from '@/components/uat/UATStepCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, Play, Send, Loader2 } from 'lucide-react';

const ROLE_TABS: { key: string; label: string }[] = [
  { key: 'public', label: 'Public Visitor' },
  { key: 'dispensary_manager', label: 'Org Manager' },
  { key: 'employee', label: 'Employee / Student' },
  { key: 'admin', label: 'Platform Admin' },
];

export default function UATFeedback() {
  const { activeRun, tasks, startRun, submitStep, completeRun } = useUATRun();

  const grouped = useMemo(() => {
    const out: Record<string, typeof tasks.data> = {};
    (tasks.data || []).forEach((t) => {
      out[t.role_to_test] = out[t.role_to_test] || [];
      out[t.role_to_test]!.push(t);
    });
    return out;
  }, [tasks.data]);

  const total = tasks.data?.length || 0;
  const done = (tasks.data || []).filter((t) => t.status !== 'pending').length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (activeRun.isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activeRun.data) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> UAT Tester Form
            </CardTitle>
            <CardDescription>
              Start a new UAT run to receive a step-by-step checklist for all four roles
              (Public Visitor, Org Manager, Employee/Student, Platform Admin). Each step has
              an action, deep link, expected result, and pass/fail with notes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => startRun.mutate()} disabled={startRun.isPending} size="lg">
              {startRun.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Start UAT Run
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" /> UAT Run {activeRun.data.run_code}
              </CardTitle>
              <CardDescription>
                {done} of {total} steps complete
              </CardDescription>
            </div>
            <Button
              onClick={() => completeRun.mutate()}
              disabled={completeRun.isPending || done === 0}
            >
              {completeRun.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Submit Run
            </Button>
          </div>
          <Progress value={pct} className="mt-3" />
        </CardHeader>
      </Card>

      <Tabs defaultValue="public">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          {ROLE_TABS.map((r) => {
            const list = grouped[r.key] || [];
            const completed = list.filter((t) => t.status !== 'pending').length;
            return (
              <TabsTrigger key={r.key} value={r.key} className="text-xs md:text-sm">
                {r.label}
                <span className="ml-2 text-muted-foreground">{completed}/{list.length}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ROLE_TABS.map((r) => (
          <TabsContent key={r.key} value={r.key} className="space-y-3 mt-4">
            {(grouped[r.key] || []).map((task) => (
              <UATStepCard
                key={task.id}
                task={task}
                onSubmit={(result, notes) =>
                  submitStep.mutateAsync({ taskId: task.id, result, notes })
                }
              />
            ))}
            {(!grouped[r.key] || grouped[r.key]!.length === 0) && (
              <p className="text-sm text-muted-foreground italic">No steps for this role.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
