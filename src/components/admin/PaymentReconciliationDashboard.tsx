import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Download, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Purchase {
  id: string;
  organization_id: string;
  quantity: number;
  amount_paid: number;
  currency: string;
  payment_method: string;
  paypal_order_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  organizations?: {
    name: string;
  };
}

interface SeatStatus {
  total_purchased: number;
  available: number;
  assigned: number;
  used: number;
  utilization_percentage: number;
}

interface AuditLog {
  id: string;
  order_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export const PaymentReconciliationDashboard = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [seatStats, setSeatStats] = useState<Record<string, SeatStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAllData();
    setupRealtime();
  }, []);

  const setupRealtime = () => {
    const channel = supabase
      .channel('payment-reconciliation')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rvt_purchases' },
        () => fetchPurchases()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'rvt_seats' },
        () => fetchPurchases()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchPurchases(),
      fetchAuditLogs()
    ]);
    setIsLoading(false);
  };

  const fetchPurchases = async () => {
    const { data, error } = await supabase
      .from('rvt_purchases')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchases');
      return;
    }

    setPurchases(data || []);

    // Fetch seat stats for each org
    const orgIds = [...new Set(data?.map(p => p.organization_id) || [])];
    const stats: Record<string, SeatStatus> = {};
    
    for (const orgId of orgIds) {
      const { data: seatData, error: seatError } = await supabase
        .rpc('get_organization_seat_status', { org_id: orgId });

      if (!seatError && seatData && seatData.length > 0) {
        stats[orgId] = seatData[0];
      }
    }

    setSeatStats(stats);
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase
      .from('payment_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching audit logs:', error);
      return;
    }

    setAuditLogs(data || []);
  };

  const verifyPendingPayment = async (purchase: Purchase) => {
    if (!purchase.paypal_order_id) {
      toast.error("No PayPal order ID found");
      return;
    }

    toast.loading("Verifying payment...", { id: 'verify' });

    const { data, error } = await supabase.functions.invoke('verify-dispensary-payment-paypal', {
      body: { orderId: purchase.paypal_order_id }
    });

    toast.dismiss('verify');

    if (error) {
      toast.error("Verification failed: " + error.message);
    } else if (data?.paid) {
      toast.success("Payment verified successfully!");
      fetchPurchases();
    } else {
      toast.info("Payment not yet completed");
    }
  };

  const markAsFailed = async (purchaseId: string) => {
    const { error } = await supabase
      .from('rvt_purchases')
      .update({ status: 'failed' })
      .eq('id', purchaseId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Marked as failed");
      fetchPurchases();
    }
  };

  const exportToCSV = () => {
    const csv = [
      ['Organization', 'Quantity', 'Amount', 'Status', 'PayPal Order ID', 'Created At', 'Completed At'].join(','),
      ...filteredPurchases.map(p => [
        p.organizations?.name || 'N/A',
        p.quantity,
        p.amount_paid,
        p.status,
        p.paypal_order_id || 'N/A',
        new Date(p.created_at).toLocaleString(),
        p.completed_at ? new Date(p.completed_at).toLocaleString() : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchases_${new Date().toISOString()}.csv`;
    a.click();
    toast.success("Exported to CSV");
  };

  const filteredPurchases = purchases.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (searchTerm && !p.organizations?.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const pendingPurchases = purchases.filter(p => 
    p.status === 'pending' && 
    new Date().getTime() - new Date(p.created_at).getTime() > 10 * 60 * 1000
  );

  const stats = {
    total: purchases.length,
    paid: purchases.filter(p => p.status === 'paid').length,
    pending: purchases.filter(p => p.status === 'pending').length,
    failed: purchases.filter(p => p.status === 'failed').length,
    totalRevenue: purchases
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount_paid), 0)
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All Purchases</TabsTrigger>
            <TabsTrigger value="failed" className="relative">
              Failed
              {pendingPurchases.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingPurchases.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="seats">Seat Allocation</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button onClick={fetchAllData} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* All Purchases Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Purchases</CardTitle>
              <CardDescription>Complete payment transaction history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Input
                  placeholder="Search organization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>PayPal Order ID</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium">
                        {purchase.organizations?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{purchase.quantity} seats</TableCell>
                      <TableCell>${Number(purchase.amount_paid).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={
                          purchase.status === 'paid' ? 'default' :
                          purchase.status === 'pending' ? 'secondary' :
                          'destructive'
                        }>
                          {purchase.status === 'paid' && <CheckCircle className="mr-1 h-3 w-3" />}
                          {purchase.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {purchase.status === 'failed' && <AlertTriangle className="mr-1 h-3 w-3" />}
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {purchase.paypal_order_id || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {purchase.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => verifyPendingPayment(purchase)}
                            >
                              Verify
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => markAsFailed(purchase.id)}
                            >
                              Mark Failed
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Failed Payments Tab */}
        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle>Failed & Abandoned Payments</CardTitle>
              <CardDescription>
                Payments that are stuck in pending state for more than 10 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingPurchases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No failed or abandoned payments
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Time Pending</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPurchases.map((purchase) => (
                      <TableRow key={purchase.id}>
                        <TableCell>{purchase.organizations?.name || 'N/A'}</TableCell>
                        <TableCell>{purchase.quantity} seats</TableCell>
                        <TableCell>${Number(purchase.amount_paid).toFixed(2)}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(purchase.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => verifyPendingPayment(purchase)}
                            >
                              Verify Now
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => markAsFailed(purchase.id)}
                            >
                              Mark Failed
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Seat Allocation Tab */}
        <TabsContent value="seats">
          <Card>
            <CardHeader>
              <CardTitle>Seat Allocation Report</CardTitle>
              <CardDescription>Seat utilization per organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Total Purchased</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(seatStats).map(([orgId, stats]) => {
                    const org = purchases.find(p => p.organization_id === orgId)?.organizations;
                    return (
                      <TableRow key={orgId}>
                        <TableCell>{org?.name || 'Unknown'}</TableCell>
                        <TableCell>{stats.total_purchased}</TableCell>
                        <TableCell className="text-green-600">{stats.available}</TableCell>
                        <TableCell className="text-blue-600">{stats.assigned}</TableCell>
                        <TableCell className="text-purple-600">{stats.used}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${stats.utilization_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm">{stats.utilization_percentage}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle>Payment Audit Log</CardTitle>
              <CardDescription>Complete timeline of payment events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{log.event_type}</div>
                        <div className="text-sm text-muted-foreground">
                          Order: {log.order_id}
                        </div>
                        <pre className="text-xs mt-1 text-muted-foreground">
                          {JSON.stringify(log.event_data, null, 2)}
                        </pre>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
