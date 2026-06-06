import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, MinusCircle, ExternalLink, Loader2 } from 'lucide-react';
import type { UATTaskRow } from '@/hooks/useUATRun';

interface Props {
  task: UATTaskRow;
  onSubmit: (result: 'pass' | 'fail' | 'skip', notes: string) => Promise<void>;
}

const statusBadge = (status: string) => {
  if (status === 'complete') return <Badge className="bg-green-600 hover:bg-green-700">Passed</Badge>;
  if (status === 'blocked') return <Badge variant="destructive">Failed</Badge>;
  if (status === 'skipped') return <Badge variant="secondary">Skipped</Badge>;
  return <Badge variant="outline">Pending</Badge>;
};

export function UATStepCard({ task, onSubmit }: Props) {
  const [notes, setNotes] = useState(task.evidence || '');
  const [saving, setSaving] = useState<'pass' | 'fail' | 'skip' | null>(null);

  useEffect(() => { setNotes(task.evidence || ''); }, [task.evidence]);

  const submit = async (result: 'pass' | 'fail' | 'skip') => {
    setSaving(result);
    try { await onSubmit(result, notes); } finally { setSaving(null); }
  };

  return (
    <Card className="border-l-4 border-l-primary/40">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">{task.task_code}</span>
              {statusBadge(task.status)}
            </div>
            <h4 className="font-semibold text-foreground">{task.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            <p className="text-sm mt-2"><span className="font-medium">Expected:</span> {task.expected_result}</p>
          </div>
          {task.deep_link && (
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <a href={task.deep_link} target="_blank" rel="noopener noreferrer">
                Open <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          )}
        </div>

        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes / observations / bug details (optional)"
          rows={2}
        />

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => submit('pass')}
            disabled={!!saving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving === 'pass' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            <span className="ml-1">Pass</span>
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => submit('fail')}
            disabled={!!saving}
          >
            {saving === 'fail' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            <span className="ml-1">Fail</span>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => submit('skip')}
            disabled={!!saving}
          >
            {saving === 'skip' ? <Loader2 className="h-4 w-4 animate-spin" /> : <MinusCircle className="h-4 w-4" />}
            <span className="ml-1">Skip</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
