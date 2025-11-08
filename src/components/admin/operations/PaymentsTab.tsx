import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { useOperationsMetrics } from '@/hooks/useOperationsMetrics';
import { PayPalManagementPanel } from '@/components/admin/PayPalManagementPanel';

export function PaymentsTab() {
  const { metrics } = useOperationsMetrics();

  return (
    <div className="space-y-6 py-6">
      {/* PayPal Management - Unified Panel */}
      <PayPalManagementPanel />

      {/* Revenue Dashboard */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(metrics.totalRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(metrics.monthlyRevenue / 100).toFixed(2)}</div>
            <p className="text-xs text-green-600 mt-1">
              <TrendingUp className="h-3 w-3 inline mr-1" />
              Current month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{metrics.pendingPayments}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting completion</p>
          </CardContent>
        </Card>
      </div>

      {/* Seat Allocation */}
      <Card>
        <CardHeader>
          <CardTitle>Training Seat Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Seats Purchased</span>
              <span className="text-2xl font-bold">{metrics.totalSeats}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Seats Assigned</span>
              <span className="text-2xl font-bold text-primary">{metrics.assignedSeats}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Seats Available</span>
              <span className="text-2xl font-bold text-green-600">{metrics.availableSeats}</span>
            </div>
            <Progress 
              value={metrics.totalSeats > 0 ? (metrics.assignedSeats / metrics.totalSeats) * 100 : 0} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground text-center">
              {metrics.totalSeats > 0 ? ((metrics.assignedSeats / metrics.totalSeats) * 100).toFixed(1) : 0}% utilization
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
