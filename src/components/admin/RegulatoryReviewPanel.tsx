import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, FileText, Video, HelpCircle, ShieldAlert, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

type QueueRow = {
  id: string;
  content_type: string | null;
  content_id: string | null;
  content_title: string | null;
  location: string | null;
  urgency: string | null;
  change_severity: string | null;
  change_summary: string | null;
  ai_suggested_change: string | null;
  draft_video_url: string | null;
  draft_faq_text: string | null;
  status: string;
  regulatory_update_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  regulatory_updates?: {
    section_number: string | null;
    previous_content: string | null;
    new_content: string | null;
  } | null;
};

type Filter = 'all' | 'video' | 'faq' | 'minor' | 'major';

const typeIcon = (t: string | null) => {
  if (!t) return <FileText className="w-3.5 h-3.5" />;
  if (t.includes('video')) return <Video className="w-3.5 h-3.5" />;
  if (t.includes('faq')) return <HelpCircle className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

const severityVariant = (s: string | null): 'destructive' | 'secondary' | 'outline' => {
  const v = (s || '').toLowerCase();
  if (v === 'major' || v === 'critical' || v === 'high') return 'destructive';
  if (v === 'minor' || v === 'low') return 'outline';
  return 'secondary';
};

export function RegulatoryReviewPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'pending' | 'history'>('pending');
  const [filter, setFilter] = useState<Filter>('all');
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [history, setHistory] = useState<QueueRow[]>([]);
  const [reviewerNames, setReviewerNames] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pendingData }, { data: histData }] = await Promise.all([
      supabase
        .from('content_review_queue')
        .select('*, regulatory_updates:regulatory_update_id(section_number, previous_content, new_content)')
        .not('status', 'in', '(approved,rejected)')
        .order('created_at', { ascending: false }),
      supabase
        .from('content_review_queue')
        .select('*, regulatory_updates:regulatory_update_id(section_number, previous_content, new_content)')
        .in('status', ['approved', 'rejected'])
        .gte('reviewed_at', new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString())
        .order('reviewed_at', { ascending: false })
        .limit(200),
    ]);
    setRows((pendingData as QueueRow[]) || []);
    setHistory((histData as QueueRow[]) || []);

    const reviewerIds = Array.from(
      new Set((histData || []).map((r: any) => r.reviewed_by).filter(Boolean))
    );
    if (reviewerIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', reviewerIds as string[]);
      const map: Record<string, string> = {};
      (profs || []).forEach((p: any) => {
        map[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      });
      setReviewerNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'video') return (r.content_type || '').includes('video');
      if (filter === 'faq') return (r.content_type || '').includes('faq');
      if (filter === 'minor') return (r.change_severity || '').toLowerCase() === 'minor';
      if (filter === 'major')
        return ['major', 'critical', 'high'].includes((r.change_severity || '').toLowerCase());
      return true;
    });
  }, [rows, filter]);

  const approve = async (r: QueueRow) => {
    if (!user) return;
    setBusy(r.id);
    try {
      const now = new Date().toISOString();
      // Apply draft if attached
      if ((r.content_type || '').includes('faq') && r.draft_faq_text && r.content_id) {
        const { error } = await supabase
          .from('faq_entries')
          .update({ answer: r.draft_faq_text })
          .eq('id', r.content_id);
        if (error) throw error;
      }
      if ((r.content_type || '').includes('video') && r.draft_video_url && r.content_id) {
        const { error } = await supabase
          .from('video_assets')
          .update({ public_url: r.draft_video_url })
          .eq('id', r.content_id);
        if (error) throw error;
      }

      const { error: upErr } = await supabase
        .from('content_review_queue')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: now,
          goes_live_at: now,
          review_note: notes[r.id] ?? r.review_note ?? null,
        })
        .eq('id', r.id);
      if (upErr) throw upErr;

      const hasDraft =
        ((r.content_type || '').includes('faq') && r.draft_faq_text) ||
        ((r.content_type || '').includes('video') && r.draft_video_url);
      toast.success(hasDraft ? 'Approved and published' : 'Approved (routed for manual update)');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Approve failed');
    } finally {
      setBusy(null);
    }
  };

  const reject = async (r: QueueRow) => {
    if (!user) return;
    const note = (notes[r.id] || '').trim();
    if (!note) {
      toast.error('A note is required to reject');
      return;
    }
    setBusy(r.id);
    try {
      // Best-effort delete of draft file if it sits in our storage
      if (r.draft_video_url && r.draft_video_url.includes('/storage/v1/')) {
        try {
          const m = r.draft_video_url.match(/\/object\/(?:public|sign)\/([^/]+)\/(.+?)(\?|$)/);
          if (m) {
            await supabase.storage.from(m[1]).remove([decodeURIComponent(m[2])]);
          }
        } catch (_) {
          /* ignore */
        }
      }
      const { error } = await supabase
        .from('content_review_queue')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq('id', r.id);
      if (error) throw error;
      toast.success('Rejected');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  const saveNote = async (r: QueueRow) => {
    const note = notes[r.id] ?? '';
    setBusy(r.id);
    try {
      const { error } = await supabase
        .from('content_review_queue')
        .update({ review_note: note })
        .eq('id', r.id);
      if (error) throw error;
      toast.success('Note saved');
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const previewDraft = async (r: QueueRow) => {
    if (!r.draft_video_url) return;
    try {
      const m = r.draft_video_url.match(/\/object\/(?:public|sign)\/([^/]+)\/(.+?)(\?|$)/);
      if (m) {
        const { data, error } = await supabase.storage.from(m[1]).createSignedUrl(decodeURIComponent(m[2]), 3600);
        if (error) throw error;
        window.open(data.signedUrl, '_blank');
      } else {
        window.open(r.draft_video_url, '_blank');
      }
    } catch (e: any) {
      toast.error(e.message || 'Preview failed');
    }
  };

  const renderItem = (r: QueueRow, isHistory = false) => {
    const exp = !!expanded[r.id];
    return (
      <div key={r.id} className="border rounded-lg p-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {typeIcon(r.content_type)} {r.content_type || 'unknown'}
          </Badge>
          {r.urgency && <Badge variant={severityVariant(r.urgency)}>urgency: {r.urgency}</Badge>}
          {r.change_severity && (
            <Badge variant={severityVariant(r.change_severity)}>{r.change_severity}</Badge>
          )}
          {r.regulatory_updates?.section_number && (
            <Badge variant="outline">COMAR {r.regulatory_updates.section_number}</Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {new Date(r.created_at).toLocaleString()}
          </span>
        </div>

        <div className="font-medium text-sm">{r.content_title || r.location || '(no title)'}</div>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap">
          {r.change_summary || r.ai_suggested_change || '(no summary)'}
        </div>

        {r.regulatory_updates && (r.regulatory_updates.previous_content || r.regulatory_updates.new_content) && (
          <Collapsible open={exp} onOpenChange={(v) => setExpanded((s) => ({ ...s, [r.id]: v }))}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
              {exp ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              View regulation diff
            </CollapsibleTrigger>
            <CollapsibleContent className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              <div className="border rounded p-2 bg-muted/30">
                <div className="text-xs font-semibold mb-1">Previous</div>
                <pre className="text-xs whitespace-pre-wrap">{r.regulatory_updates.previous_content || '(none)'}</pre>
              </div>
              <div className="border rounded p-2 bg-muted/30">
                <div className="text-xs font-semibold mb-1">New</div>
                <pre className="text-xs whitespace-pre-wrap">{r.regulatory_updates.new_content || '(none)'}</pre>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {!isHistory && (
          <>
            {!r.draft_video_url && !r.draft_faq_text && (
              <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> No draft attached — approval routes for manual update.
              </div>
            )}
            <Textarea
              value={notes[r.id] ?? r.review_note ?? ''}
              onChange={(e) => setNotes((s) => ({ ...s, [r.id]: e.target.value }))}
              placeholder="Review note (required to reject)"
              className="text-sm"
              rows={2}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy === r.id} onClick={() => approve(r)}>
                Approve &amp; Go Live
              </Button>
              <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => reject(r)}>
                Reject
              </Button>
              <Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => saveNote(r)}>
                Add Note
              </Button>
              {r.draft_video_url && (
                <Button size="sm" variant="ghost" onClick={() => previewDraft(r)}>
                  <ExternalLink className="w-3 h-3 mr-1" /> Preview Draft
                </Button>
              )}
            </div>
          </>
        )}

        {isHistory && (
          <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t">
            <div>
              <Badge variant={r.status === 'approved' ? 'default' : 'destructive'}>{r.status}</Badge>{' '}
              by {r.reviewed_by ? reviewerNames[r.reviewed_by] || r.reviewed_by.slice(0, 8) : 'unknown'}{' '}
              {r.reviewed_at && `· ${new Date(r.reviewed_at).toLocaleString()}`}
            </div>
            {r.review_note && <div className="italic">"{r.review_note}"</div>}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center gap-2 text-lg">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <ShieldAlert className="w-5 h-5 text-primary" />
              Regulatory Review
              {rows.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {rows.length} pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                <Button size="sm" variant={tab === 'pending' ? 'default' : 'outline'} onClick={() => setTab('pending')}>
                  Pending ({rows.length})
                </Button>
                <Button size="sm" variant={tab === 'history' ? 'default' : 'outline'} onClick={() => setTab('history')}>
                  History ({history.length})
                </Button>
              </div>
              {tab === 'pending' && (
                <div className="flex gap-1 ml-auto">
                  {(['all', 'video', 'faq', 'minor', 'major'] as Filter[]).map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={filter === f ? 'secondary' : 'ghost'}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {loading && <div className="text-sm text-muted-foreground">Loading…</div>}

            {tab === 'pending' && !loading && (
              <div className="space-y-3">
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No pending items in this filter.
                  </div>
                ) : (
                  filtered.map((r) => renderItem(r, false))
                )}
              </div>
            )}

            {tab === 'history' && !loading && (
              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No reviewed items in the last 90 days.
                  </div>
                ) : (
                  history.map((r) => renderItem(r, true))
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
