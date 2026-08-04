import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Loader2, Shield, Clapperboard, ArrowLeft, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

const RVT_COURSE_ID = 'e6841a2f-4e92-47c3-9ed4-243ccc22338b';

interface SlideSpecSlide {
  heading: string;
  bullets: string[];
  chip?: string;
  key?: boolean;
}

interface SlideSpec {
  title: { module: string; lines: string[]; subtitle: string; chip: string };
  slides: SlideSpecSlide[];
  narration: string[];
  closing: { lines: string[]; sub: string; chip: string };
}

interface AssetRow {
  id: string;
  module_id: string | null;
  slide_spec: SlideSpec | null;
  review_status: string | null;
  render_status: string | null;
  public_url: string | null;
}

interface StudioRow {
  module_id: string;
  module_number: number | null;
  title: string;
  asset: AssetRow | null;
}

const emptySpec = (): SlideSpec => ({
  title: { module: '', lines: [], subtitle: '', chip: '' },
  slides: [],
  narration: ['', ''],
  closing: { lines: [], sub: '', chip: '' },
});

const linesToText = (v: string[] | undefined) => (v ?? []).join('\n');
const textToLines = (v: string) =>
  v.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

const renderBadge = (status: string | null) => {
  switch (status) {
    case 'queued':
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Queued</Badge>;
    case 'rendering':
      return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Rendering</Badge>;
    case 'published':
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Published</Badge>;
    case 'error':
      return <Badge variant="destructive">Error</Badge>;
    default:
      return <Badge variant="secondary">—</Badge>;
  }
};

const reviewBadge = (status: string | null) => {
  switch (status) {
    case 'approved':
      return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Approved</Badge>;
    case 'script_pending_review':
      return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Pending review</Badge>;
    default:
      return <Badge variant="secondary">—</Badge>;
  }
};

const VideoStudio: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<StudioRow | null>(null);
  const [spec, setSpec] = useState<SlideSpec>(emptySpec());
  const [saving, setSaving] = useState(false);
  const [confirmApprove, setConfirmApprove] = useState<StudioRow | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ['admin', 'video-studio', 'rvt-modules'],
    queryFn: async (): Promise<StudioRow[]> => {
      const { data: modules, error: modErr } = await supabase
        .from('course_modules')
        .select('id, module_number, title')
        .eq('course_id', RVT_COURSE_ID)
        .order('module_number', { ascending: true });
      if (modErr) throw modErr;

      const { data: assets, error: assetErr } = await supabase
        .from('video_assets')
        .select('id, module_id, slide_spec, review_status, render_status, public_url')
        .eq('is_active', true);
      if (assetErr) throw assetErr;

      const byModule = new Map<string, AssetRow>();
      for (const a of (assets ?? []) as unknown as AssetRow[]) {
        if (a.module_id && !byModule.has(a.module_id)) byModule.set(a.module_id, a);
      }

      return (modules ?? []).map((m: any) => ({
        module_id: m.id,
        module_number: m.module_number,
        title: m.title,
        asset: byModule.get(m.id) ?? null,
      }));
    },
    enabled: isAdmin,
  });

  const openEditor = (row: StudioRow) => {
    const existing = row.asset?.slide_spec;
    const base: SlideSpec = existing
      ? {
          title: {
            module: existing.title?.module ?? '',
            lines: existing.title?.lines ?? [],
            subtitle: existing.title?.subtitle ?? '',
            chip: existing.title?.chip ?? '',
          },
          slides: (existing.slides ?? []).map((s) => ({
            heading: s.heading ?? '',
            bullets: s.bullets ?? [],
            chip: s.chip ?? '',
            key: !!s.key,
          })),
          narration: existing.narration ?? [],
          closing: {
            lines: existing.closing?.lines ?? [],
            sub: existing.closing?.sub ?? '',
            chip: existing.closing?.chip ?? '',
          },
        }
      : emptySpec();

    // Normalize narration length to slides.length + 2
    const needed = base.slides.length + 2;
    const narration = [...base.narration];
    while (narration.length < needed) narration.splice(narration.length - 1 < 0 ? 0 : narration.length - 1, 0, '');
    base.narration = narration.slice(0, needed);
    while (base.narration.length < needed) base.narration.push('');

    setSpec(base);
    setEditing(row);
  };

  const setSlide = (index: number, patch: Partial<SlideSpecSlide>) => {
    setSpec((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));
  };

  const setNarration = (index: number, value: string) => {
    setSpec((prev) => {
      const narration = [...prev.narration];
      narration[index] = value;
      return { ...prev, narration };
    });
  };

  const addSlide = () => {
    setSpec((prev) => {
      const narration = [...prev.narration];
      // insert before the closing narration (last element)
      narration.splice(Math.max(narration.length - 1, 0), 0, '');
      return {
        ...prev,
        slides: [...prev.slides, { heading: '', bullets: [], chip: '', key: false }],
        narration,
      };
    });
  };

  const removeSlide = (index: number) => {
    setSpec((prev) => {
      const narration = [...prev.narration];
      narration.splice(index + 1, 1); // slide narration lives at index+1
      return {
        ...prev,
        slides: prev.slides.filter((_, i) => i !== index),
        narration,
      };
    });
  };

  const narrationValid = useMemo(
    () => spec.narration.length === spec.slides.length + 2,
    [spec],
  );

  const handleSave = async () => {
    if (!editing?.asset) return;
    setSaving(true);
    try {
      const payload: SlideSpec = {
        title: spec.title,
        slides: spec.slides.map((s) => ({
          heading: s.heading,
          bullets: s.bullets,
          ...(s.chip ? { chip: s.chip } : {}),
          key: !!s.key,
        })),
        narration: spec.narration,
        closing: spec.closing,
      };

      const { error } = await supabase
        .from('video_assets')
        .update({
          slide_spec: payload as any,
          review_status: 'script_pending_review',
        })
        .eq('id', editing.asset.id);
      if (error) throw error;

      toast({ title: 'Script saved', description: 'Marked as pending review.' });
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-studio', 'rvt-modules'] });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const row = confirmApprove;
    if (!row?.asset) return;
    try {
      const { error } = await supabase
        .from('video_assets')
        .update({
          review_status: 'approved',
          reviewed_by: user?.id ?? null,
          reviewed_at: new Date().toISOString(),
          render_status: 'queued',
        })
        .eq('id', row.asset.id);
      if (error) throw error;
      toast({ title: 'Approved', description: 'Queued for render.' });
      setConfirmApprove(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'video-studio', 'rvt-modules'] });
    } catch (err: any) {
      toast({ title: 'Approval failed', description: err.message, variant: 'destructive' });
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin role required to view the RVT Video Studio.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
          <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
            <Clapperboard className="h-7 w-7" /> RVT Video Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Author and approve the on-screen script and narration for each RVT module video.
            Rendering happens in a separate backend worker.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>RVT Modules</CardTitle>
            <CardDescription>One row per module, with its active video asset.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module #</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Review</TableHead>
                      <TableHead>Render</TableHead>
                      <TableHead>Script</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rows ?? []).map((row) => {
                      const asset = row.asset;
                      const canApprove =
                        !!asset &&
                        (asset.review_status === 'script_pending_review' ||
                          asset.review_status === 'approved');
                      return (
                        <TableRow key={row.module_id}>
                          <TableCell className="font-mono text-xs">{row.module_number ?? '—'}</TableCell>
                          <TableCell>{row.title}</TableCell>
                          <TableCell>{reviewBadge(asset?.review_status ?? null)}</TableCell>
                          <TableCell>{renderBadge(asset?.render_status ?? null)}</TableCell>
                          <TableCell>{asset?.slide_spec ? 'Yes' : 'No'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {asset?.render_status === 'published' && asset.public_url && (
                                <a
                                  href={asset.public_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                                >
                                  View <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!asset}
                                onClick={() => openEditor(row)}
                              >
                                {asset ? 'Edit' : 'no asset'}
                              </Button>
                              <Button
                                size="sm"
                                disabled={!canApprove}
                                onClick={() => setConfirmApprove(row)}
                              >
                                Approve for render
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Script editor */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Module {editing?.module_number ?? '—'} — {editing?.title}
            </DialogTitle>
            <DialogDescription>
              Narration must have exactly {spec.slides.length + 2} entries: title, one per slide, closing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Title section */}
            <section className="space-y-3 border rounded-lg p-4">
              <h3 className="font-semibold">Title card</h3>
              <div className="space-y-2">
                <Label>Module label</Label>
                <Input
                  value={spec.title.module}
                  onChange={(e) => setSpec((p) => ({ ...p, title: { ...p.title, module: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Lines (one per line)</Label>
                <Textarea
                  rows={3}
                  value={linesToText(spec.title.lines)}
                  onChange={(e) =>
                    setSpec((p) => ({ ...p, title: { ...p.title, lines: textToLines(e.target.value) } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={spec.title.subtitle}
                  onChange={(e) => setSpec((p) => ({ ...p, title: { ...p.title, subtitle: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Chip (citation)</Label>
                <Input
                  value={spec.title.chip}
                  onChange={(e) => setSpec((p) => ({ ...p, title: { ...p.title, chip: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Title narration</Label>
                <Textarea
                  rows={3}
                  value={spec.narration[0] ?? ''}
                  onChange={(e) => setNarration(0, e.target.value)}
                />
              </div>
            </section>

            {/* Slides */}
            {spec.slides.map((slide, i) => (
              <section key={i} className="space-y-3 border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Slide {i + 1}</h3>
                  <Button size="sm" variant="ghost" onClick={() => removeSlide(i)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Heading</Label>
                  <Input value={slide.heading} onChange={(e) => setSlide(i, { heading: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Bullets (one per line)</Label>
                  <Textarea
                    rows={4}
                    value={linesToText(slide.bullets)}
                    onChange={(e) => setSlide(i, { bullets: textToLines(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chip (citation, optional)</Label>
                  <Input value={slide.chip ?? ''} onChange={(e) => setSlide(i, { chip: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={!!slide.key} onCheckedChange={(v) => setSlide(i, { key: v })} />
                  <Label>Key compliance point</Label>
                </div>
                <div className="space-y-2">
                  <Label>Slide {i + 1} narration</Label>
                  <Textarea
                    rows={3}
                    value={spec.narration[i + 1] ?? ''}
                    onChange={(e) => setNarration(i + 1, e.target.value)}
                  />
                </div>
              </section>
            ))}

            <Button variant="outline" onClick={addSlide} className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Add slide
            </Button>

            {/* Closing */}
            <section className="space-y-3 border rounded-lg p-4">
              <h3 className="font-semibold">Closing card</h3>
              <div className="space-y-2">
                <Label>Lines (one per line)</Label>
                <Textarea
                  rows={3}
                  value={linesToText(spec.closing.lines)}
                  onChange={(e) =>
                    setSpec((p) => ({ ...p, closing: { ...p.closing, lines: textToLines(e.target.value) } }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Sub</Label>
                <Input
                  value={spec.closing.sub}
                  onChange={(e) => setSpec((p) => ({ ...p, closing: { ...p.closing, sub: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Chip (citation)</Label>
                <Input
                  value={spec.closing.chip}
                  onChange={(e) => setSpec((p) => ({ ...p, closing: { ...p.closing, chip: e.target.value } }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Closing narration</Label>
                <Textarea
                  rows={3}
                  value={spec.narration[spec.slides.length + 1] ?? ''}
                  onChange={(e) => setNarration(spec.slides.length + 1, e.target.value)}
                />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !narrationValid}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Save script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve confirm */}
      <Dialog open={!!confirmApprove} onOpenChange={(open) => !open && setConfirmApprove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve for render</DialogTitle>
            <DialogDescription>
              Approve this script for rendering? The worker will regenerate and publish this module's
              video from exactly this text.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmApprove(null)}>
              Cancel
            </Button>
            <Button onClick={handleApprove}>Approve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoStudio;
