import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, RefreshCw, AlertCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PaymentEventRow {
  id: string;
  event_type: string | null;
  status: string | null;
  amount: number | string | null;
  currency: string | null;
  paypal_order_id: string | null;
  paypal_event_id: string | null;
  created_at: string;
  application_id: string | null;
  dispensary_applications: {
    organization_name: string | null;
    contact_email: string | null;
  } | null;
}

interface PurchaseSummary {
  total_purchases: number;
  paid: number;
  pending: number;
  failed: number;
  total_revenue: number;
  total_seats_sold: number;
}

const EMPTY_SUMMARY: PurchaseSummary = {
  total_purchases: 0,
  paid: 0,
  pending: 0,
  failed: 0,
  total_revenue: 0,
  total_seats_sold: 0,
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

function formatEventType(raw: string | null): string {
  if (!raw) return '—';
  return raw
    .toLowerCase()
    .split(/[._]/)
    .filter((s) => s !== 'payment')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function formatAmount(amount: number | string | null, currency: string | null): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(num);
  } catch {
    return `$${num.toFixed(2)}`;
  }
}

function StatusBadge({ status }: { status: string | null }) {
  const s = (status || '').toLowerCase();
  const map: Record<string, { label: string; className: string }> = {
    processed: { label: 'Processed', className: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100' },
    received: { label: 'Received', className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100' },
    invalid_signature: { label: 'Invalid Sig', className: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100' },
    unrecognized: { label: 'Unrecognized', className: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100' },
    unhandled: { label: 'Unhandled', className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100' },
    created: { label: 'Order Created', className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100' },
  };
  const entry = map[s] ?? { label: status || '—', className: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100' };
  return <Badge variant="outline" className={entry.className}>{entry.label}</Badge>;
}

function OrderIdCell({ id }: { id: string | null }) {
  if (!id) return <span className="text-muted-foreground">—</span>;
  const short = id.length > 12 ? `${id.slice(0, 12)}…` : id;
  return (
    <button
      type="button"
      className="font-mono text-xs text-primary hover:underline"
      title={`Click to copy: ${id}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          toast({ title: 'Copied', description: 'Order ID copied to clipboard' });
        } catch {
          toast({ title: 'Copy failed', variant: 'destructive' });
        }
      }}
    >
      {short}
    </button>
  );
}

export function PaymentTransactionsPanel() {
  const [events, setEvents] = useState<PaymentEventRow[]>([]);
  const [summary, setSummary] = useState<PurchaseSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [eventsRes, purchasesRes] = await Promise.all([
        supabase
          .from('payment_events')
          .select(
            'id, event_type, status, amount, currency, paypal_order_id, paypal_event_id, created_at, application_id, dispensary_applications(organization_name, contact_email)'
          )
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('rvt_purchases')
          .select('status, amount_paid, quantity'),
      ]);

      if (eventsRes.error) throw eventsRes.error;
      if (purchasesRes.error) throw purchasesRes.error;

      setEvents((eventsRes.data as unknown as PaymentEventRow[]) ?? []);

      const rows = (purchasesRes.data ?? []) as Array<{
        status: string | null;
        amount_paid: number | string | null;
        quantity: number | null;
      }>;
      const agg = rows.reduce<PurchaseSummary>((acc, r) => {
        acc.total_purchases += 1;
        if (r.status === 'paid') {
          acc.paid += 1;
          const a = typeof r.amount_paid === 'string' ? parseFloat(r.amount_paid) : r.amount_paid ?? 0;
          if (!Number.isNaN(a)) acc.total_revenue += a;
          acc.total_seats_sold += r.quantity ?? 0;
        } else if (r.status === 'pending') {
          acc.pending += 1;
        } else if (r.status === 'failed') {
          acc.failed += 1;
        }
        return acc;
      }, { ...EMPTY_SUMMARY });
      setSummary(agg);
      setLastRefreshed(new Date());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load payment data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" /> Total Revenue
            </div>
            <div className="text-2xl font-bold mt-2">{formatAmount(summary.total_revenue, 'USD')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-muted-foreground text-sm">Seats Sold</div>
            <div className="text-2xl font-bold mt-2">{summary.total_seats_sold}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 text-sm ${summary.pending > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              <Clock className="h-4 w-4" /> Pending Payments
            </div>
            <div className={`text-2xl font-bold mt-2 ${summary.pending > 0 ? 'text-amber-600' : ''}`}>
              {summary.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className={`flex items-center gap-2 text-sm ${summary.failed > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              <AlertCircle className="h-4 w-4" /> Failed Payments
            </div>
            <div className={`text-2xl font-bold mt-2 ${summary.failed > 0 ? 'text-red-600' : ''}`}>
              {summary.failed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events table header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Recent Payment Events</h3>
          {lastRefreshed && (
            <p className="text-xs text-muted-foreground">
              Last refreshed {lastRefreshed.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-800 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading payment events…
        </div>
      ) : events.length === 0 && !error ? (
        <div className="text-center text-muted-foreground py-12 border rounded-md">
          No payment events yet. PayPal webhook events will appear here once payments are processed.
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date / Time</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Event Type</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell className="whitespace-nowrap text-sm">{formatDateTime(ev.created_at)}</TableCell>
                  <TableCell className="text-sm">
                    {ev.dispensary_applications?.organization_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{formatEventType(ev.event_type)}</TableCell>
                  <TableCell><OrderIdCell id={ev.paypal_order_id} /></TableCell>
                  <TableCell className="text-sm">{formatAmount(ev.amount, ev.currency)}</TableCell>
                  <TableCell><StatusBadge status={ev.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default PaymentTransactionsPanel;
