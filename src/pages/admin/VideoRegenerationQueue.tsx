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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCw, Shield, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

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
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Approved</Badge>;
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

  const { data: rows, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: QUEUE_KEY,
    queryFn: async (): Promise<QueueRow[]> => {
      const { data, error } = await supabase.rpc('get_video_regeneration_queue' as any);
      if (error) throw error;
      return (data ?? []) as unknown as QueueRow[];
    },
    enabled: allowed,
  });

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

  const submitMarkRegenerated = async () => {
    if (!markTarget) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc('mark_video_regenerated' as any, {
        p_asset_id: markTarget.asset_id,
        p_new_public_url: newUrl.trim() ? newUrl.trim() : null,
        p_note: note.trim() ? note.trim() : null,
      });
      if (error) throw error;
      if (handleResult(data, 'Marked as regenerated')) {
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
      if (handleResult(data, 'Video approved')) {
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-7 w-7" /> Video Regeneration Queue
            </h1>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
          <p className="text-muted-foreground mt-1">
            Training videos flagged for regeneration after a Maryland COMAR regulation change — record the new
            video and sign it off once reviewed.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Flagged videos</CardTitle>
            <CardDescription>Only videos with an open regeneration flag appear here.</CardDescription>
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
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>COMAR reference</TableHead>
                      <TableHead>Reason flagged</TableHead>
                      <TableHead>Flagged since</TableHead>
                      <TableHead>Draft script</TableHead>
                      <TableHead>Review status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.asset_id}>
                        <TableCell className="font-medium">
                          {row.module_number != null ? `${row.module_number}. ` : ''}
                          {row.module_title || row.asset_key || '—'}
                        </TableCell>
                        <TableCell>{row.course_title || '—'}</TableCell>
                        <TableCell>{row.comar_reference || '—'}</TableCell>
                        <TableCell className="max-w-[240px] text-sm text-muted-foreground">
                          {row.reason || '—'}
                        </TableCell>
                        <TableCell className="text-sm">{relativeDate(row.flagged_since)}</TableCell>
                        <TableCell>
                          {row.has_draft_script ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Script ready</Badge>
                          ) : (
                            <Badge variant="secondary">No script</Badge>
                          )}
                        </TableCell>
                        <TableCell>{reviewBadge(row.review_status)}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-2"
                            onClick={() => {
                              setNewUrl('');
                              setNote('');
                              setMarkTarget(row);
                            }}
                          >
                            Mark regenerated
                          </Button>
                          <Button size="sm" onClick={() => setApproveTarget(row)}>
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mark regenerated dialog */}
      <Dialog open={!!markTarget} onOpenChange={(open) => !open && setMarkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark video as regenerated</DialogTitle>
            <DialogDescription>
              Records that a new video was produced for{' '}
              {markTarget?.module_title || markTarget?.asset_key || 'this module'}. If you enter a new video URL it replaces the live video immediately; leave it blank to record that the existing video was re-reviewed and is still accurate. Sets the video to pending review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-video-url">New video URL (optional)</Label>
              <Input
                id="new-video-url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
              />
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
            <Button onClick={submitMarkRegenerated} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve confirm dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve this video?</DialogTitle>
            <DialogDescription>
              Final compliance sign-off for{' '}
              {approveTarget?.module_title || approveTarget?.asset_key || 'this module'}. Marks the video approved and clears the regeneration flag. This does not change the video file itself — to replace the video, use 'Mark regenerated' with a new URL.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submitApprove} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoRegenerationQueue;
