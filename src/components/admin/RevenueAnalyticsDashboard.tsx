import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIERS, formatPrice } from '@/config/subscription-tiers';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Building2, 
  PieChart,
  Calendar 
} from 'lucide-react';

interface RevenueMetrics {
  totalOrganizations: number;
  activeSubscriptions: number;
  totalSeats: number;
  usedSeats: number;
  tierDistribution: Record<string, number>;
  totalRevenueCents: number;
  projectedAnnualCents: number;
}

export function RevenueAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Fetch organizations with subscription data
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id, subscription_tier, annual_price_cents, max_active_seats')
        .eq('admin_approved', true);

      if (orgError) throw orgError;

      // Fetch seat usage
      const { data: seats, error: seatError } = await supabase
        .from('rvt_seats')
        .select('status, organization_id');

      if (seatError) throw seatError;

      // Calculate metrics
      const tierDistribution: Record<string, number> = {};
      let totalRevenue = 0;

      orgs?.forEach((org) => {
        const tier = org.subscription_tier || 'starter';
        tierDistribution[tier] = (tierDistribution[tier] || 0) + 1;
        totalRevenue += org.annual_price_cents || 350000;
      });

      const totalSeats = seats?.length || 0;
      const usedSeats = seats?.filter(s => s.status === 'used' || s.status === 'assigned').length || 0;

      setMetrics({
        totalOrganizations: orgs?.length || 0,
        activeSubscriptions: orgs?.filter(o => o.subscription_tier).length || 0,
        totalSeats,
        usedSeats,
        tierDistribution,
        totalRevenueCents: totalRevenue,
        projectedAnnualCents: totalRevenue,
      });
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!metrics) return null;

  const seatUtilization = metrics.totalSeats > 0 
    ? Math.round((metrics.usedSeats / metrics.totalSeats) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Revenue Analytics</h2>
          <p className="text-muted-foreground">Subscription and revenue metrics</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              Annual Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatPrice(metrics.totalRevenueCents)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatPrice(Math.round(metrics.totalRevenueCents / 12))}/month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeSubscriptions} with active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-600" />
              Total Seats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSeats}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.usedSeats} currently in use
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Seat Utilization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{seatUtilization}%</div>
            <Progress value={seatUtilization} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Tier Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Tier Distribution
          </CardTitle>
          <CardDescription>
            Breakdown of organizations by subscription tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const count = metrics.tierDistribution[tier.tierName] || 0;
              const percentage = metrics.totalOrganizations > 0 
                ? Math.round((count / metrics.totalOrganizations) * 100) 
                : 0;
              const tierRevenue = count * tier.annualPriceCents;

              return (
                <div key={tier.id} className="space-y-2 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{tier.displayName}</h4>
                    <Badge variant={tier.isPopular ? 'default' : 'secondary'}>
                      {count}
                    </Badge>
                  </div>
                  <Progress value={percentage} />
                  <div className="text-sm text-muted-foreground">
                    {percentage}% of organizations
                  </div>
                  <div className="text-sm font-medium text-green-600">
                    {formatPrice(tierRevenue)} revenue
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Projections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Revenue Projections
          </CardTitle>
          <CardDescription>
            Based on current subscription mix and market assumptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground">Year 1 (Current)</h4>
              <p className="text-2xl font-bold mt-1">
                {formatPrice(metrics.projectedAnnualCents)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.totalOrganizations} organizations
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground">Year 2 (40% growth)</h4>
              <p className="text-2xl font-bold mt-1">
                {formatPrice(Math.round(metrics.projectedAnnualCents * 1.4))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ~{Math.round(metrics.totalOrganizations * 1.4)} organizations projected
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="text-sm font-medium text-muted-foreground">Year 3 (60% growth)</h4>
              <p className="text-2xl font-bold mt-1">
                {formatPrice(Math.round(metrics.projectedAnnualCents * 1.96))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ~{Math.round(metrics.totalOrganizations * 1.96)} organizations projected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
