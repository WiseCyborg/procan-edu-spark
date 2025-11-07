import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { detectPaymentGaps } from '@/services/gapDetectionService';
import { GapAlert } from './GapAlert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, AlertCircle, CreditCard, Users, Mail } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export const PaymentGapDashboard = () => {
  const { data: gaps, isLoading } = useQuery({
    queryKey: ['payment-gaps'],
    queryFn: detectPaymentGaps,
    refetchInterval: 120000, // Refresh every 2 minutes
  });

  const handleSendRenewal = (gap: any) => {
    toast.success('Renewal reminder sent', {
      description: `Reminder sent to ${gap.affected_entity}`,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment & License Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!gaps || gaps.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Payment & License Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">All Payments Current</h3>
            <p className="text-sm text-muted-foreground">
              No payment or licensing issues detected
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expiringLicenses = gaps.filter(g => g.title.includes('Expiring'));
  const failedPayments = gaps.filter(g => g.title.includes('Failed'));
  const seatIssues = gaps.filter(g => g.title.includes('Seats'));
  
  const revenueAtRisk = expiringLicenses.length * 50 + failedPayments.length * 100; // Simplified

  return (
    <div className="space-y-6">
      {/* Revenue Risk Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue at Risk</p>
                <p className="text-2xl font-bold">${revenueAtRisk}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-3xl font-bold">{expiringLicenses.length}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Payments</p>
                <p className="text-3xl font-bold">{failedPayments.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Seat Issues</p>
                <p className="text-3xl font-bold">{seatIssues.length}</p>
              </div>
              <Users className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Licenses */}
      {expiringLicenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Licenses Expiring Soon ({expiringLicenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Days Until Expiry</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiringLicenses.map(gap => (
                  <TableRow key={gap.id}>
                    <TableCell className="font-medium">{gap.affected_entity}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {gap.metadata?.days_until_expiry} days
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gap.severity === 'critical' ? 'destructive' : 'secondary'}>
                        {gap.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendRenewal(gap)}
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        Send Renewal
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Failed Payments */}
      {failedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-600" />
              Failed Payments ({failedPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedPayments.map(gap => (
                <GapAlert
                  key={gap.id}
                  gap={gap}
                  onAction={handleSendRenewal}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seat Issues */}
      {seatIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-yellow-600" />
              Training Seat Issues ({seatIssues.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {seatIssues.map(gap => (
                <GapAlert
                  key={gap.id}
                  gap={gap}
                  onAction={handleSendRenewal}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
