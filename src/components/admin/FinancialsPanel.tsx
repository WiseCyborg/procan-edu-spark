import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, DollarSign, AlertTriangle, CheckCircle2, Link2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const fmt = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const Kpi = ({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: ReactNode }) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span>{icon}</div>
      <div className="text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </CardContent>
  </Card>
);

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>
);

export const FinancialsPanel = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('admin-finance-summary', { body: {} });
      if (error) throw error;
      setData(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load financials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return (
    <div className="space-y-3">
      <p className="text-sm text-destructive">Couldn’t load financial data: {error}</p>
      <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 me-2" />Retry</Button>
    </div>
  );

  const pp = data?.paypal?.this_month || {};
  const ppLast = data?.paypal?.last_month || {};
  const app = data?.app_native?.this_month || {};
  const recon = data?.reconciliation || {};
  const qb = data?.quickbooks || {};
  const netDelta = (pp.net ?? 0) - (ppLast.net ?? 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">PayPal: {pp.environment || '—'}</Badge>
          {data?.generated_at && <span className="text-xs text-muted-foreground">Updated {new Date(data.generated_at).toLocaleString()}</span>}
        </div>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="h-4 w-4 me-2" />Refresh</Button>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">PayPal — Month to Date</h3>
        {pp.available ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Gross Sales" value={fmt(pp.gross_sales)} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
            <Kpi label="Fees" value={fmt(pp.fees)} />
            <Kpi label="Refunds" value={fmt(pp.refunds)} />
            <Kpi label="Net" value={fmt(pp.net)} sub={netDelta >= 0 ? `▲ ${fmt(Math.abs(netDelta))} vs last mo` : `▼ ${fmt(Math.abs(netDelta))} vs last mo`} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">PayPal reporting unavailable ({pp.reason || 'unknown'}{pp.detail ? `: ${pp.detail}` : ''}).</p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">App-Recorded Sales (MTD)</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Course orders (paid)" value={fmt(app.orders_paid_revenue)} />
            <Row label="Orders pending" value={String(app.orders_pending_count ?? 0)} />
            <Row label="RVT seat purchases" value={fmt(app.rvt_completed_revenue)} />
            <Row label="New entitlements" value={String(app.new_entitlements ?? 0)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">Reconciliation {recon.available && (Math.abs(recon.variance) < 0.01 ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />)}</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {recon.available ? (<>
              <Row label="PayPal net (MTD)" value={fmt(recon.paypal_net_mtd)} />
              <Row label="App-recorded paid (MTD)" value={fmt(recon.app_recorded_paid_mtd)} />
              <Row label="Variance" value={fmt(recon.variance)} />
              <p className="text-xs text-muted-foreground pt-1">{recon.note}</p>
            </>) : <p className="text-sm text-muted-foreground">Reconciliation available once PayPal reporting returns.</p>}
          </CardContent>
        </Card>
      </div>

      <Card className={qb.connected ? '' : 'border-dashed'}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">QuickBooks {qb.connected ? <Badge variant="outline" className="text-green-700 border-green-500">Connected</Badge> : <Badge variant="outline">Not connected</Badge>}</CardTitle>
          <CardDescription>Profit &amp; loss, cash, and receivables/payables</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {qb.connected ? (
            <div className="grid grid-cols-3 gap-4">
              <Kpi label="Income" value={fmt(qb.profit_and_loss?.income)} />
              <Kpi label="Expenses" value={fmt(qb.profit_and_loss?.expenses)} />
              <Kpi label="Net Income" value={fmt(qb.profit_and_loss?.net_income)} />
            </div>
          ) : (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Link2 className="h-4 w-4 mt-0.5" />
              <span>QuickBooks isn’t connected yet. This section lights up automatically once the Intuit credentials are added on the backend (Phase 2).</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
