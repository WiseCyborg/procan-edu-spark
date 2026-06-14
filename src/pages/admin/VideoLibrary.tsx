import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Shield, Video, CheckCircle2, AlertTriangle, Copy, ArrowLeft, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

interface VideoAssetRow {
  id: string;
  asset_key: string;
  title: string;
  access_level: 'public' | 'authenticated' | 'enrolled' | string;
  course_id: string | null;
  bucket_id: string | null;
  storage_path: string | null;
  is_active: boolean;
}

interface BucketObject {
  name: string;
  size: number | null;
}

const BUCKET = 'training-videos';
const SUPABASE_PROJECT_REF = 'zhmpwczrvitomsxjwpzc';

const VideoLibrary: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['admin', 'video-assets'],
    queryFn: async (): Promise<VideoAssetRow[]> => {
      const { data, error } = await supabase
        .from('video_assets')
        .select('id, asset_key, title, access_level, course_id, bucket_id, storage_path, is_active')
        .order('asset_key', { ascending: true });
      if (error) throw error;
      return (data ?? []) as VideoAssetRow[];
    },
    enabled: isAdmin,
  });

  // Best-effort: list bucket contents (admins typically have storage list via RLS or service role.
  // If RLS denies, we just report "unknown" and rely on storage_path presence).
  const { data: bucketIndex } = useQuery({
    queryKey: ['admin', 'training-videos-bucket'],
    queryFn: async (): Promise<Record<string, BucketObject> | null> => {
      const { data, error } = await supabase.storage.from(BUCKET).list('', {
        limit: 1000,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) {
        // Bucket may not exist yet (lazy-created by edge function on first signed-URL request).
        return null;
      }
      const map: Record<string, BucketObject> = {};
      for (const item of data ?? []) {
        map[item.name] = { name: item.name, size: (item.metadata as any)?.size ?? null };
      }
      return map;
    },
    enabled: isAdmin,
  });

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
            <CardDescription>Admin role required to view the video library.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: text });
  };

  const fileStatus = (row: VideoAssetRow): { label: string; tone: 'ok' | 'warn' | 'pending' | 'unknown'; detail?: string } => {
    if (!row.storage_path) return { label: 'No file mapped', tone: 'pending' };
    // Vimeo refs play via embed fallback while migration is in progress
    if (row.storage_path.startsWith('vimeo/')) {
      return { label: 'Playing via Vimeo (migration pending)', tone: 'ok', detail: 'Re-upload as MP4 to Supabase to cut over' };
    }

    if (!bucketIndex) return { label: 'Bucket not yet created', tone: 'unknown', detail: 'Will be created on first signed-URL request' };
    const exists = bucketIndex[row.storage_path];
    if (exists) {
      const mb = exists.size ? (exists.size / (1024 * 1024)).toFixed(1) : '?';
      return { label: `Uploaded (${mb} MB)`, tone: 'ok' };
    }
    return { label: 'File missing', tone: 'warn', detail: `Upload to ${BUCKET}/${row.storage_path}` };
  };

  const toneBadge = (tone: 'ok' | 'warn' | 'pending' | 'unknown') => {
    switch (tone) {
      case 'ok':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Ready
          </Badge>
        );
      case 'warn':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="h-3 w-3 mr-1" /> Action needed
          </Badge>
        );
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const counts = (assets ?? []).reduce(
    (acc, row) => {
      const s = fileStatus(row);
      acc.total += 1;
      acc[s.tone] += 1;
      return acc;
    },
    { total: 0, ok: 0, warn: 0, pending: 0, unknown: 0 },
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" /> Admin
            </Link>
            <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
              <Video className="h-7 w-7" /> Video Library
            </h1>
            <p className="text-muted-foreground mt-1">
              Inventory of <code>video_assets</code> rows and their upload status in the private{' '}
              <code>{BUCKET}</code> bucket.
            </p>
          </div>
          <Button asChild variant="outline">
            <a
              href={`https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/storage/buckets/${BUCKET}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open bucket <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total assets" value={counts.total} />
          <StatCard label="Ready" value={counts.ok} tone="ok" />
          <StatCard label="Need upload / re-encode" value={counts.warn + counts.pending} tone="warn" />
          <StatCard label="Unknown" value={counts.unknown} />
        </div>

        {!bucketIndex && (
          <Card className="border-amber-500/40 bg-amber-500/5">
            <CardContent className="pt-4 text-sm text-amber-700 dark:text-amber-300">
              The <code>{BUCKET}</code> bucket is not visible to this client (either it doesn't exist yet or storage RLS
              hides it). It will be created automatically the first time the <code>get-video-url</code> edge function
              runs after deploy. Upload status below falls back to "metadata only".
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Assets</CardTitle>
            <CardDescription>Read-only inventory. Upload files via the Supabase dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4 font-medium">Asset key</th>
                      <th className="py-2 pr-4 font-medium">Title</th>
                      <th className="py-2 pr-4 font-medium">Access</th>
                      <th className="py-2 pr-4 font-medium">Storage path</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(assets ?? []).map((row) => {
                      const status = fileStatus(row);
                      return (
                        <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="py-2 pr-4 font-mono text-xs">{row.asset_key}</td>
                          <td className="py-2 pr-4">{row.title}</td>
                          <td className="py-2 pr-4">
                            <Badge variant="outline" className="text-xs">
                              {row.access_level}
                            </Badge>
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">
                            {row.storage_path ? (
                              <button
                                onClick={() => handleCopy(row.storage_path!)}
                                className="inline-flex items-center gap-1 hover:text-primary"
                                title="Copy path"
                              >
                                {row.storage_path}
                                <Copy className="h-3 w-3" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleCopy(`${row.asset_key}.mp4`)}
                                className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                                title={`Copy suggested filename ${row.asset_key}.mp4`}
                              >
                                <span className="italic">none — suggest {row.asset_key}.mp4</span>
                                <Copy className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                          <td className="py-2 pr-4">
                            <div className="flex flex-col gap-1">
                              {toneBadge(status.tone)}
                              {status.detail && (
                                <span className="text-xs text-muted-foreground">{status.detail}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload checklist</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>1. Re-encode source video to H.264 MP4, ~1.5 Mbps, 1080p max (see <code>docs/VIDEO_ENCODING_RUNBOOK.md</code>).</p>
            <p>2. Upload to the <code>{BUCKET}</code> bucket using the exact path from the "Storage path" column above.</p>
            <p>3. The <code>get-video-url</code> edge function mints a short-lived signed URL on playback — no further wiring required.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; tone?: 'ok' | 'warn' }> = ({ label, value, tone }) => (
  <Card>
    <CardContent className="pt-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 ${
          tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : ''
        }`}
      >
        {value}
      </p>
    </CardContent>
  </Card>
);

export default VideoLibrary;
