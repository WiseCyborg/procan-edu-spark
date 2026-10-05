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
  jobStatusLabel,
  playbackLabel,
  queueBlockers,
  regenerationStageLabel,
  showApproveScript,
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
}

const relativeDate = (iso: string | null) => {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

const reviewBadge = (status: string | null) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Script approved</Badge>;
    case 'pending_review':
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Pending review</Badge>;
    case 'script_pending_review':
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Script pending review</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status || '—'}</Badge>;
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
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data: rows, dataUpdatedAt, isLoading, isError, error, refetch } = useQuery({
    queryKey: QUEUE_KEY,
    queryFn: async (): Promise<QueueRow[]> => {
      const { data, error } = await supabase.rpc('get_video_regeneration_queue' as any);
      if (error) throw error;
      return (data ?? []) as unknown as QueueRow[];
    },
    enabled: allowed,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const refreshQueue = async () => {
    setRefreshing(true);
    try {
      const result = await refetch();
      if (result.error) {
        toast({
          title: 'Refresh failed',
          description: result.error.message,
          variant: 'destructive',
        });
      }
    } finally {
      setRefreshing(false);
    }
  };

  const lastRefreshedLabel = dataUpdatedAt
    ? `Last refreshed ${new Date(dataUpdatedAt).toLocaleString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
      })}`
    : 'Not refreshed yet';

  const handleResult = (result: any, fallbackTitle: string) => {
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

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4 rtl-flip" /> Admin
          </Link>
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-7 w-7" /> Video Regeneration Queue
            </h1>
            <div className="ms-auto flex flex-col items-end gap-1">
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
              <p className="text-xs text-muted-foreground" data-testid="last-refreshed">
                {lastRefreshedLabel}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground mt-1">
            Training videos flagged for regeneration after a Maryland COMAR regulation change. Approving a script
            queues narration; registering a replacement candidate records it for review. Neither action clears the
            regeneration flag or swaps the live video.
          </p>
          <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium">The regeneration flag stays open until every gate is met</p>
            <p className="text-muted-foreground mt-1">
              A flagged video is only cleared once the replacement is stored in R2, mapped to the module,
              playback-verified, and explicitly published. Nothing on this page performs those steps.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flagged videos</CardTitle>
            <CardDescription>
              {rows && rows.length > 0
                ? `${rows.length} flagged videos, each with its stored regeneration stage.`
                : 'Only videos with an open regeneration flag appear here.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
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
                  return (
                    <article key={row.asset_id} className="rounded-lg border bg-background p-4 space-y-3 break-words">
                      <div className="space-y-1">
                        <h2 className="font-semibold">
                          {row.module_number != null ? `${row.module_number}. ` : ''}
                          {row.module_title || row.asset_key || '—'}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {row.course_title || '—'}
                          {row.comar_reference ? ` · ${row.comar_reference}` : ''}
                        </p>
                      </div>
                      <p className="text-sm">Flagged {relativeDate(row.flagged_since)}</p>
                      <p className="text-sm text-muted-foreground">{row.reason || '—'}</p>
                      <div className="flex flex-wrap gap-2">
                        {row.has_draft_script ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Script ready</Badge>
                        ) : (
                          <Badge variant="secondary">No script</Badge>
                        )}
                        {reviewBadge(row.review_status)}
                      </div>
                      <p className="text-sm">
                        {regenerationStageLabel(row)}
                        <span className="text-muted-foreground">
                          {' '}
                          · {row.pipeline_stage || '—'}
                          {row.render_status ? ` · render ${row.render_status}` : ''}
                        </span>
                      </p>
                      <p className="text-sm text-muted-foreground">{playbackLabel(row.playback_verified)}</p>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{jobStatusLabel(row)}</p>
                        {row.job_last_error ? (
                          <p className="text-sm text-muted-foreground">{row.job_last_error}</p>
                        ) : null}
                        {row.render_error ? (
                          <p className="text-sm text-muted-foreground">Render error: {row.render_error}</p>
                        ) : null}
                        {row.pipeline_last_error ? (
                          <p className="text-sm text-muted-foreground">Pipeline error: {row.pipeline_last_error}</p>
                        ) : null}
                        {blockers.map((blocker) => (
                          <p key={blocker} className="text-sm font-medium text-destructive">
                            {blocker}
                          </p>
                        ))}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewUrl('');
                            setNote('');
                            setMarkTarget(row);
                          }}
                        >
                          Register replacement candidate
                        </Button>
                        {showApproveScript(row.review_status) ? (
                          <Button type="button" size="sm" onClick={() => setApproveTarget(row)}>
                            Approve script &amp; queue narration
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Register replacement candidate dialog */}
      <Dialog open={!!markTarget} onOpenChange={(open) => !open && setMarkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register replacement candidate</DialogTitle>
            <DialogDescription>
              Records a candidate replacement for{' '}
              {markTarget?.module_title || markTarget?.asset_key || 'this module'} and sets it to pending review.
              This does not clear the regeneration flag: the flag stays open until the replacement is stored in R2,
              mapped to the module, playback-verified, and explicitly published.
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

      {/* Approve script confirm dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve script &amp; queue narration?</DialogTitle>
            <DialogDescription>
              Compliance sign-off on the reviewed script for{' '}
              {approveTarget?.module_title || approveTarget?.asset_key || 'this module'}. Narration and rendering
              happen downstream. The live video is unchanged, and the regeneration flag remains open until the
              replacement is stored in R2, mapped, playback-verified, and explicitly published.
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
    </div>
  );
};

export default VideoRegenerationQueue;
