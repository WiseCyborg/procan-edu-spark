import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, Shield, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import {
  candidateUrlRequired,
  compareQueueRows,
  priorityTier,
  queueBlockers,
  queueSummary,
  queueWideBlockers,
  regenerationSteps,
  showApproveScript,
  showRequeueNarration,
  type StepState,
} from '@/lib/videoRegeneration';

interface QueueRow {
  asset_id: string;
  asset_key: string | null;
  module_number: number | null;
  module_title: string | null;
  course_title: string | null;
  reason: string | null;
  flagged_since: string | null;
  has_draft_script: boolean | null;
  review_status: string | null;
  comar_reference: string | null;
  pipeline_stage: string | null;
  render_status: string | null;
  candidate_registered: boolean | null;
  candidate_stored_in_r2: boolean | null;
  playback_verified: boolean | null;
  pipeline_last_error: string | null;
  render_error: string | null;
  job_type: string | null;
  job_status: string | null;
  job_last_error: string | null;
  job_held: boolean | null;
  last_action_at: string | null;
  narration_status: string | null;
  narration_error: string | null;
  narration_held: boolean | null;
  render_job_status: string | null;
  render_job_error: string | null;
  render_job_held: boolean | null;
  mapped: boolean | null;
  replacement_published: boolean | null;
}

const calendarDate = (iso: string | null) => {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  return then.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const calendarStamp = (iso: string | null) => {
  if (!iso) return '—';
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '—';
  return then.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const stepClass = (state: StepState) => {
  switch (state) {
    case 'done':
      return 'border-emerald-600/40 bg-emerald-600/10';
    case 'failed':
      return 'border-destructive/40 bg-destructive/10';
    case 'current':
      return 'border-amber-500/50 bg-amber-500/10';
    default:
      return 'border-border bg-muted/30';
  }
};

const QUEUE_KEY = ['admin', 'video-regeneration-queue'];

const VideoRegenerationQueue: React.FC = () => {
  const { isAdmin, isTrainingCoordinator, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const allowed = isAdmin || isTrainingCoordinator;

  const [markTarget, setMarkTarget] = useState<QueueRow | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [note, setNote] = useState('');
  const [approveTarget, setApproveTarget] = useState<QueueRow | null>(null);
  const [requeueTarget, setRequeueTarget] = useState<QueueRow | null>(null);
  const [scriptTarget, setScriptTarget] = useState<QueueRow | null>(null);
  const [scriptText, setScriptText] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('Not refreshed yet');

  const { data: rows, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUEUE_KEY,
    queryFn: async (): Promise<QueueRow[]> => {
      const { data, error } = await supabase.rpc('get_video_regeneration_queue' as any);
      if (error) throw error;
      return ((data ?? []) as unknown as QueueRow[]).slice().sort(compareQueueRows);
    },
    enabled: allowed,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const refreshQueue = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshMessage('Refreshing flagged videos and job statuses…');
    const started = Date.now();
    try {
      const result = await refetch();
      if (result.error) {
        setRefreshMessage('Refresh failed. The list was not updated.');
        toast({
          title: 'Refresh failed',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      const when = new Date().toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      });
      const count = result.data?.length ?? 0;
      const message = `Last refreshed ${when}. Reloaded ${count} flagged videos.`;
      setRefreshMessage(message);
      toast({ title: 'Queue refreshed', description: message });
    } finally {
      const elapsed = Date.now() - started;
      if (elapsed < 400) {
        await new Promise((resolve) => setTimeout(resolve, 400 - elapsed));
      }
      setRefreshing(false);
    }
  };

  const lastRefreshedLabel = refreshing
    ? 'Refreshing flagged videos and job statuses…'
    : refreshMessage;

  const handleResult = (result: any, fallbackTitle: string) => {
    if (result?.already_approved) {
      toast({
        title: 'Script already approved',
        description: 'No new narration job was queued, and the flag date was left as it was.',
      });
      queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
      return true;
    }
    if (result?.ok) {
      toast({ title: fallbackTitle, description: result.review_status ? `Status: ${result.review_status}` : undefined });
      queryClient.invalidateQueries({ queryKey: QUEUE_KEY });
      return true;
    }
    toast({
      title: 'Action failed',
      description: result?.error || 'The request could not be completed.',
      variant: 'destructive',
    });
    return false;
  };

  const urlIsRequired = candidateUrlRequired(markTarget?.candidate_registered);

  const submitMarkRegenerated = async () => {
    if (!markTarget) return;
    if (urlIsRequired && !newUrl.trim()) {
      toast({
        title: 'Candidate video URL is required',
        description: 'Paste the replacement URL, or wait until the pipeline stores the regenerated video in R2 and registers it.',
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('mark_video_regenerated' as any, {
        p_asset_id: markTarget.asset_id,
        p_new_public_url: newUrl.trim() ? newUrl.trim() : null,
        p_note: note.trim() ? note.trim() : null,
      });
      if (error) throw error;
      if (handleResult(data, 'Replacement candidate registered')) {
        setMarkTarget(null);
        setNewUrl('');
        setNote('');
      }
    } catch (err: any) {
      toast({ title: 'Action failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const submitApprove = async () => {
    if (!approveTarget) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('approve_video_regeneration' as any, {
        p_asset_id: approveTarget.asset_id,
      });
      if (error) throw error;
      if (handleResult(data, 'Script approved & narration queued')) {
        setApproveTarget(null);
      }
    } catch (err: any) {
      toast({ title: 'Approval failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const submitRequeue = async () => {
    if (!requeueTarget) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('requeue_video_narration' as any, {
        p_asset_id: requeueTarget.asset_id,
      });
      if (error) throw error;
      if (handleResult(data, 'Narration re-queued for this module')) {
        setRequeueTarget(null);
      }
    } catch (err: any) {
      toast({ title: 'Re-queue failed', description: err.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const openScript = async (row: QueueRow) => {
    setScriptTarget(row);
    setScriptText('');
    setScriptLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_video_draft_script' as any, {
        p_asset_id: row.asset_id,
      });
      if (error) throw error;
      setScriptText(typeof data === 'string' && data.trim() ? data : 'No draft script is stored for this module.');
    } catch (err: any) {
      setScriptText(err.message || 'The script could not be loaded.');
    } finally {
      setScriptLoading(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              Admin or training coordinator role required to view the Video Regeneration Queue.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const summary = queueSummary(rows ?? []);
  const wideBlocks = queueWideBlockers(rows ?? []);

  return (
    <div className="min-h-screen max-w-full overflow-x-clip bg-background p-4 md:p-6">
      <div className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4 rtl-flip" /> Admin
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-7 w-7" /> Video Regeneration Queue
            </h1>
            <div className="ms-auto flex w-full min-w-0 max-w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={refreshQueue}
                disabled={refreshing}
                aria-busy={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 me-2" />
                )}
                {refreshing ? 'Refreshing' : 'Refresh'}
              </Button>
              <p className="max-w-full text-xs text-muted-foreground sm:text-right" data-testid="last-refreshed">
                {lastRefreshedLabel}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Training videos flagged for regeneration. Approving a script queues narration for that module only.
            Re-queue appears only after the latest narration job has failed. Neither action clears the flag or
            swaps the live video.
          </p>
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">The regeneration flag stays open until every gate is met</p>
            <p className="text-muted-foreground mt-1">
              A flagged video is only cleared once the replacement is stored in R2, mapped to the module,
              playback-verified, and explicitly published. Nothing on this page performs those steps.
            </p>
          </div>
        </div>

        {rows && rows.length > 0 ? (
          <div className="space-y-3" data-testid="queue-summary">
            <div className="flex flex-wrap gap-2">
              {summary.map((item) => (
                <Badge key={item.label} variant="secondary">
                  {item.label}: {item.value}
                </Badge>
              ))}
            </div>
            {wideBlocks.map((blocker) => (
              <p key={blocker} className="text-sm font-medium text-destructive">
                {blocker}
              </p>
            ))}
          </div>
        ) : null}

        <Card className="min-w-0 max-w-full overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Flagged videos</CardTitle>
            <CardDescription>
              {rows && rows.length > 0
                ? 'Sorted by priority tier, then module number. One card per flagged video.'
                : 'Only videos with an open regeneration flag appear here.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">Could not load the queue</p>
                  <p className="text-sm text-muted-foreground">{(error as any)?.message || 'Unknown error'}</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={refreshQueue} disabled={refreshing}>
                    Try again
                  </Button>
                </div>
              </div>
            ) : !rows || rows.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No videos are awaiting regeneration — all training content is current.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rows.map((row) => {
                  const blockers = queueBlockers(row);
                  const tier = priorityTier(row.module_number, row.reason);
                  const steps = regenerationSteps(row);
                  const reason = row.reason || '—';
                  const expanded = !!expandedReasons[row.asset_id];
                  const reasonLong = reason.length > 120;
                  return (
                    <article key={row.asset_id} className="min-w-0 max-w-full space-y-3 break-words rounded-lg border bg-background p-4">
                      <div className="flex min-w-0 flex-wrap items-start gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h2 className="font-semibold">
                            {row.module_number != null ? `Module ${row.module_number}. ` : ''}
                            {row.module_title || row.asset_key || '—'}
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            {row.course_title || '—'}
                            {row.comar_reference ? ` · ${row.comar_reference}` : ''}
                          </p>
                          <p className="text-sm" data-testid="flagged-since">
                            Flagged since <span className="font-medium">{calendarDate(row.flagged_since)}</span>
                            <span className="text-muted-foreground"> · </span>
                            <span data-testid="last-action">
                              Last action <span className="font-medium">{calendarStamp(row.last_action_at)}</span>
                            </span>
                          </p>
                        </div>
                        <Badge variant={tier.rank === 1 ? 'destructive' : 'secondary'}>{tier.label}</Badge>
                      </div>

                      <ol className="flex min-w-0 flex-wrap gap-2" aria-label="Regeneration steps">
                        {steps.map((step) => (
                          <li
                            key={step.key}
                            className={`min-w-0 max-w-full break-words rounded-md border px-2 py-1 text-xs ${stepClass(step.state)}`}
                            data-testid={`step-${step.key}`}
                          >
                            <span className="font-medium">{step.label}</span>
                            <span className="mt-0.5 block break-words text-muted-foreground">{step.detail}</span>
                          </li>
                        ))}
                      </ol>

                      <div className="min-w-0 space-y-1 text-sm">
                        <p className={expanded ? 'whitespace-pre-wrap break-words' : 'line-clamp-1 break-words'}>{reason}</p>
                        {reasonLong ? (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto px-0"
                            onClick={() =>
                              setExpandedReasons((current) => ({
                                ...current,
                                [row.asset_id]: !current[row.asset_id],
                              }))
                            }
                          >
                            {expanded ? 'Show less' : 'Show more'}
                          </Button>
                        ) : null}
                      </div>

                      {blockers.map((blocker) => (
                        <p key={blocker} className="text-sm font-medium text-destructive">
                          {blocker}
                        </p>
                      ))}

                      <div className="flex min-w-0 flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-auto max-w-full whitespace-normal" onClick={() => openScript(row)}>
                          Read script
                        </Button>
                        {showApproveScript(row.review_status) ? (
                          <Button type="button" size="sm" className="h-auto max-w-full whitespace-normal" onClick={() => setApproveTarget(row)}>
                            Approve script &amp; queue narration
                          </Button>
                        ) : null}
                        {showRequeueNarration(row.narration_status) ? (
                          <Button type="button" variant="outline" size="sm" className="h-auto max-w-full whitespace-normal" onClick={() => setRequeueTarget(row)}>
                            Re-queue narration
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto max-w-full whitespace-normal"
                          onClick={() => {
                            setNewUrl('');
                            setNote('');
                            setMarkTarget(row);
                          }}
                        >
                          Register candidate
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!markTarget} onOpenChange={(open) => !open && setMarkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register replacement candidate</DialogTitle>
            <DialogDescription>
              Records a candidate replacement for{' '}
              {markTarget?.module_title || markTarget?.asset_key || 'this module'}. A stored R2 file is registered
              by the render step, so this URL is only required when that file is not already registered. This does
              not clear the regeneration flag.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-video-url">
                Candidate video URL{urlIsRequired ? ' (required)' : ' (already registered)'}
              </Label>
              <Input
                id="new-video-url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                required={urlIsRequired}
                aria-required={urlIsRequired}
              />
              <p className="text-sm text-muted-foreground">
                {urlIsRequired
                  ? 'Required until the pipeline stores the regenerated MP4 in R2 and registers it. A blank URL is rejected.'
                  : 'The pipeline already registered this replacement. Leave the URL blank to keep it, or paste a URL to replace it.'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="regeneration-note">Note (optional)</Label>
              <Textarea
                id="regeneration-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What changed in this version?"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitMarkRegenerated} disabled={busy || (urlIsRequired && !newUrl.trim())}>
              {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              Register candidate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve script &amp; queue narration?</DialogTitle>
            <DialogDescription>
              Compliance sign-off on the reviewed script for{' '}
              {approveTarget?.module_title || approveTarget?.asset_key || 'this module'}. This queues narration for
              this module only. The live video is unchanged, and the original flag date stays in place.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitApprove} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              Approve script &amp; queue narration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!requeueTarget} onOpenChange={(open) => !open && setRequeueTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-queue narration?</DialogTitle>
            <DialogDescription>
              Queues one new narration job for{' '}
              {requeueTarget?.module_title || requeueTarget?.asset_key || 'this module'} because the latest narration
              job failed. Other failed narration jobs are left as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequeueTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitRequeue} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
              Re-queue narration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!scriptTarget} onOpenChange={(open) => !open && setScriptTarget(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {scriptTarget?.module_number != null ? `Module ${scriptTarget.module_number}. ` : ''}
              {scriptTarget?.module_title || 'Draft script'}
            </DialogTitle>
            <DialogDescription>The stored draft. This view does not approve it.</DialogDescription>
          </DialogHeader>
          {scriptLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm">{scriptText}</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setScriptTarget(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoRegenerationQueue;
