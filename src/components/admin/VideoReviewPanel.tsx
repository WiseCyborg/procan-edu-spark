import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Video,
  FileText,
  Clock,
} from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const BRAND = {
  bg: '#1a3a2a',
  accent: '#52b788',
  gold: '#f9c74f',
};

interface PendingVideo {
  id: string;
  module_id: string | null;
  asset_key: string | null;
  public_url: string | null;
  draft_video_url: string | null;
  draft_script: string | null;
  draft_generated_at: string | null;
  regeneration_reason: string | null;
  module_number: number | null;
  module_title: string | null;
}

type PendingAction = { kind: 'approve' | 'reject'; row: PendingVideo } | null;

export function VideoReviewPanel() {
  const [rows, setRows] = useState<PendingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [openScripts, setOpenScripts] = useState<Record<string, boolean>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from('video_assets')
      .select(
        'id, module_id, asset_key, public_url, draft_video_url, draft_script, draft_generated_at, regeneration_reason, course_modules:module_id(module_number, title)'
      )
      .eq('review_status', 'pending_review')
      .order('draft_generated_at', { ascending: false });

    if (error) {
      console.error(error);
      toast.error('Failed to load review queue');
      setRows([]);
    } else {
      const mapped: PendingVideo[] = (data || []).map((r: any) => ({
        id: r.id,
        module_id: r.module_id,
        asset_key: r.asset_key,
        public_url: r.public_url,
        draft_video_url: r.draft_video_url,
        draft_script: r.draft_script,
        draft_generated_at: r.draft_generated_at,
        regeneration_reason: r.regeneration_reason,
        module_number: r.course_modules?.module_number ?? null,
        module_title: r.course_modules?.title ?? null,
      }));
      setRows(mapped);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    load();
  };

  const performApprove = async (row: PendingVideo) => {
    setWorking(row.id);
    const now = new Date().toISOString();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('video_assets')
      .update({
        public_url: row.draft_video_url,
        review_status: null,
        draft_video_url: null,
        draft_script: null,
        reviewed_at: now,
        last_regenerated_at: now,
        reviewed_by: userData.user?.id ?? null,
        needs_regeneration: false,
      })
      .eq('id', row.id);
    setWorking(null);
    if (error) {
      toast.error(`Approve failed: ${error.message}`);
      return;
    }
    toast.success('Video published to learners');
    load();
  };

  const performReject = async (row: PendingVideo) => {
    setWorking(row.id);
    const now = new Date().toISOString();
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('video_assets')
      .update({
        review_status: null,
        draft_video_url: null,
        draft_script: null,
        reviewed_at: now,
        reviewed_by: userData.user?.id ?? null,
      })
      .eq('id', row.id);
    setWorking(null);
    if (error) {
      toast.error(`Reject failed: ${error.message}`);
      return;
    }
    toast.success('Draft rejected. Current video remains live.');
    load();
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { kind, row } = pendingAction;
    setPendingAction(null);
    if (kind === 'approve') await performApprove(row);
    else await performReject(row);
  };

  return (
    <Card
      className="border-2"
      style={{ backgroundColor: BRAND.bg, borderColor: BRAND.accent }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <Video className="h-5 w-5" style={{ color: BRAND.accent }} />
          <CardTitle className="text-white">Video Review Queue</CardTitle>
          <Badge
            style={{
              backgroundColor: rows.length > 0 ? BRAND.gold : BRAND.accent,
              color: '#1a3a2a',
            }}
          >
            {loading ? '…' : rows.length} pending
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="text-white hover:bg-white/10"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner label="Loading review queue" />
          </div>
        ) : rows.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-12 rounded-md border border-dashed"
            style={{ borderColor: BRAND.accent, color: '#cfe9d8' }}
          >
            <CheckCircle2 className="h-8 w-8 mb-2" style={{ color: BRAND.accent }} />
            <p className="text-sm">No videos awaiting review. All compliance content is current.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const scriptOpen = !!openScripts[row.id];
              const busy = working === row.id;
              return (
                <div
                  key={row.id}
                  className="rounded-lg border p-4"
                  style={{ borderColor: BRAND.accent, backgroundColor: '#143024' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="text-white font-semibold">
                        {row.module_number !== null ? `Module ${row.module_number}: ` : ''}
                        {row.module_title || row.asset_key || 'Untitled module'}
                      </div>
                      {row.draft_generated_at && (
                        <div className="flex items-center gap-1 text-xs mt-1" style={{ color: '#9ec8b0' }}>
                          <Clock className="h-3 w-3" />
                          Generated {formatDistanceToNow(new Date(row.draft_generated_at), { addSuffix: true })}
                        </div>
                      )}
                    </div>
                  </div>

                  {row.regeneration_reason && (
                    <div
                      className="flex items-start gap-2 p-3 rounded mb-3 text-sm"
                      style={{
                        backgroundColor: 'rgba(249,199,79,0.12)',
                        border: `1px solid ${BRAND.gold}`,
                        color: BRAND.gold,
                      }}
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <div className="font-semibold uppercase text-xs tracking-wide mb-1">
                          Why this regenerated
                        </div>
                        <div>{row.regeneration_reason}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide mb-1" style={{ color: '#9ec8b0' }}>
                        Current (Live)
                      </div>
                      {row.public_url ? (
                        <video
                          src={row.public_url}
                          controls
                          className="w-full rounded bg-black aspect-video"
                        />
                      ) : (
                        <div className="aspect-video rounded bg-black/60 flex items-center justify-center text-xs text-white/60">
                          No current video
                        </div>
                      )}
                    </div>
                    <div>
                      <div
                        className="text-xs uppercase tracking-wide mb-1 font-semibold"
                        style={{ color: BRAND.gold }}
                      >
                        New Draft (Pending)
                      </div>
                      {row.draft_video_url ? (
                        <video
                          src={row.draft_video_url}
                          controls
                          className="w-full rounded bg-black aspect-video"
                        />
                      ) : (
                        <div className="aspect-video rounded bg-black/60 flex items-center justify-center text-xs text-white/60">
                          No draft video URL
                        </div>
                      )}
                    </div>
                  </div>

                  {row.draft_script && (
                    <Collapsible
                      open={scriptOpen}
                      onOpenChange={(o) => setOpenScripts((s) => ({ ...s, [row.id]: o }))}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white hover:bg-white/10 w-full justify-between mb-2"
                        >
                          <span className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            {scriptOpen ? 'Hide' : 'Read'} narration script
                          </span>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${scriptOpen ? 'rotate-180' : ''}`}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div
                          className="text-sm whitespace-pre-wrap rounded p-3 mb-3 max-h-80 overflow-y-auto"
                          style={{
                            backgroundColor: '#0e2419',
                            border: `1px solid ${BRAND.accent}`,
                            color: '#e6f3ec',
                          }}
                        >
                          {row.draft_script}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  <div className="flex flex-wrap gap-2 justify-end pt-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setPendingAction({ kind: 'reject', row })}
                      className="border-red-500 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      disabled={busy || !row.draft_video_url}
                      onClick={() => setPendingAction({ kind: 'approve', row })}
                      style={{ backgroundColor: BRAND.accent, color: '#0e2419' }}
                      className="hover:opacity-90"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {busy ? 'Working…' : 'Approve & Publish'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pendingAction} onOpenChange={(o) => !o && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === 'approve' ? 'Publish new video?' : 'Reject draft?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === 'approve'
                ? 'This will replace the live video that learners see. Continue?'
                : 'This will discard the regenerated draft and keep the current live video. Continue?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction}>
              {pendingAction?.kind === 'approve' ? 'Publish' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default VideoReviewPanel;
