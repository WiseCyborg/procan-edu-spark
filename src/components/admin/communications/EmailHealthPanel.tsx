import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface FailedRow {
  id: string;
  recipient_email: string | null;
  email_type: string | null;
  error_message: string | null;
  created_at: string;
}

interface Stats {
  sent24h: number;
  failed24h: number;
  stuck: number;
}

export const EmailHealthPanel = () => {
  const [stats, setStats] = useState<Stats>({ sent24h: 0, failed24h: 0, stuck: 0 });
  const [failed, setFailed] = useState<FailedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const [sentRes, failedRes, stuckRes, failedRowsRes] = await Promise.all([
        supabase.from("email_logs").select("id", { count: "exact", head: true })
          .eq("status", "sent").gte("created_at", since24h),
        supabase.from("email_logs").select("id", { count: "exact", head: true })
          .eq("status", "failed").gte("created_at", since24h),
        supabase.from("email_logs").select("id", { count: "exact", head: true })
          .eq("status", "sending").lt("created_at", stuckCutoff),
        supabase.from("email_logs")
          .select("id, recipient_email, email_type, error_message, created_at")
          .eq("status", "failed")
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

      setStats({
        sent24h: sentRes.count ?? 0,
        failed24h: failedRes.count ?? 0,
        stuck: stuckRes.count ?? 0,
      });
      setFailed((failedRowsRes.data ?? []) as FailedRow[]);
    } catch (e: any) {
      toast.error(`Failed to load email health: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  const retry = async (id: string) => {
    setRetryingId(id);
    try {
      const { error } = await supabase.functions.invoke("retry-failed-email", {
        body: { email_id: id },
      });
      if (error) throw error;
      toast.success("Retry triggered");
      await load();
    } catch (e: any) {
      toast.error(`Retry failed: ${e.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" /> Sent (24h)
            </CardDescription>
            <CardTitle className="text-3xl">{stats.sent24h}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" /> Failed (24h)
            </CardDescription>
            <CardTitle className="text-3xl">{stats.failed24h}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" /> Stuck &gt;10m
            </CardDescription>
            <CardTitle className="text-3xl">{stats.stuck}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent failed emails</CardTitle>
            <CardDescription>Most recent 25 failures. Retry uses the existing edge function.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {failed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No failures 🎉</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failed.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.recipient_email ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{row.email_type ?? "general"}</Badge></TableCell>
                    <TableCell className="text-xs text-red-700 max-w-[320px] truncate" title={row.error_message ?? ""}>
                      {row.error_message ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(row.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retryingId === row.id}
                        onClick={() => retry(row.id)}
                      >
                        {retryingId === row.id ? "…" : "Retry"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
