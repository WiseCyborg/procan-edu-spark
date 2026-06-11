import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Database, KeyRound, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

interface SeedRow {
  id: string;
  entity_table: string;
  entity_id: string;
  seed_batch: string;
  created_at: string;
  notes: string | null;
}

const UATControls: React.FC = () => {
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<unknown>(null);

  const { data: seedRows, refetch } = useQuery({
    queryKey: ['admin', 'uat-seed-entities'],
    queryFn: async (): Promise<SeedRow[]> => {
      const { data, error } = await supabase
        .from('uat_seed_entities')
        .select('id, entity_table, entity_id, seed_batch, created_at, notes')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SeedRow[];
    },
    enabled: !!isAdmin,
  });

  const callFn = async (name: string, body: unknown = {}) => {
    setBusy(name);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      setLastResult(data);
      const ok = (data as any)?.success !== false;
      toast({
        title: ok ? `${name} succeeded` : `${name} returned an error`,
        description: ok ? 'See result panel below.' : (data as any)?.error_code ?? 'unknown error',
        variant: ok ? 'default' : 'destructive',
      });
      await refetch();
    } catch (err: any) {
      toast({ title: `${name} failed`, description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (roleLoading) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="animate-spin" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="container mx-auto p-8">
        <Card><CardHeader><CardTitle>Admin access required</CardTitle></CardHeader></Card>
      </div>
    );
  }

  const batches = Array.from(new Set((seedRows ?? []).map((r) => r.seed_batch)));

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2" />Back to Admin</Link>
        </Button>
        <h1 className="text-2xl font-bold">UAT Controls</h1>
      </div>
      <p className="text-muted-foreground">
        One-click operations to prepare the platform for Dani & Louis testing. All seed data is
        registered in <code>uat_seed_entities</code> and can be removed in a single action.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" />Vault: regression key</CardTitle>
            <CardDescription>Installs the service-role key into Vault so the post-migration regression cron can authenticate.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => callFn('install-regression-vault-secret')} disabled={busy !== null} className="w-full">
              {busy === 'install-regression-vault-secret' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Install / refresh secret'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" />Seed UAT dataset</CardTitle>
            <CardDescription>Creates Sunrise Wellness MD + 3 employees (mid-training, certified, expired cert).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => callFn('seed-uat-dataset')} disabled={busy !== null} className="w-full">
              {busy === 'seed-uat-dataset' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run seed'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Trash2 className="h-4 w-4" />Purge UAT dataset</CardTitle>
            <CardDescription>Deletes every row registered by the seed tool. Safe to run repeatedly.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => callFn('purge-uat-seed-dataset')} disabled={busy !== null} variant="destructive" className="w-full">
              {busy === 'purge-uat-seed-dataset' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Purge all UAT seed'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Database className="h-4 w-4" />Registered seed entities</CardTitle>
          <CardDescription>
            {seedRows?.length ?? 0} rows across {batches.length} batch{batches.length === 1 ? '' : 'es'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(seedRows?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No seed data currently registered.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {seedRows!.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm border-b pb-2">
                  <div>
                    <code className="text-xs">{r.entity_table}</code>
                    <span className="text-muted-foreground ml-2">{r.notes ?? r.entity_id}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">{r.seed_batch}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {lastResult ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Last result</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">{JSON.stringify(lastResult, null, 2)}</pre>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
};

export default UATControls;
