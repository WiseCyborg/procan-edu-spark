import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice, getTierByName, getNextTier } from '@/config/subscription-tiers';
import { Crown, Users, Archive, Calendar, TrendingUp, AlertTriangle } from 'lucide-react';
import { TierUpgradeModal } from './TierUpgradeModal';

interface SubscriptionStatus {
  organizationId: string;
  organizationName: string;
  tier: {
    name: string;
    displayName: string;
    maxActiveSeats: number;
    rotationalBuffer: number;
    annualPriceCents: number;
    features: string[];
  };
  usage: {
    activeSeats: number;
    archivedSeats: number;
    remainingActive: number;
    remainingBuffer: number;
    utilizationPercent: number;
  };
  subscription: {
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    pricingType: string;
    isRotationalEnabled: boolean;
  };
}

interface SubscriptionOverviewCardProps {
  organizationId: string;
}

export function SubscriptionOverviewCard({ organizationId }: SubscriptionOverviewCardProps) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [organizationId]);

  const fetchSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_organization_subscription_status', {
        org_id: organizationId,
      });

      if (error) throw error;
      setStatus(data as unknown as SubscriptionStatus);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const tierInfo = getTierByName(status.tier.name);
  const nextTier = getNextTier(status.tier.name);
  const isNearCapacity = status.usage.utilizationPercent >= 80;
  const isAtCapacity = status.usage.remainingActive <= 0;
  const isNearRenewal = status.subscription.daysRemaining !== null && status.subscription.daysRemaining <= 30;

  return (
    <>
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Subscription</CardTitle>
            </div>
            <Badge variant={tierInfo?.isPopular ? 'default' : 'secondary'} className="text-sm">
              {status.tier.displayName}
            </Badge>
          </div>
          <CardDescription>
            {formatPrice(status.tier.annualPriceCents)}/year
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Capacity Warning */}
          {isAtCapacity && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Seat limit reached. Upgrade to add more users.</span>
            </div>
          )}

          {/* Active Seats Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Active Seats</span>
              </div>
              <span className="font-medium">
                {status.usage.activeSeats} / {status.tier.maxActiveSeats}
              </span>
            </div>
            <Progress 
              value={status.usage.utilizationPercent} 
              className={isNearCapacity ? 'bg-destructive/20' : ''} 
            />
            {isNearCapacity && !isAtCapacity && (
              <p className="text-xs text-muted-foreground">
                Only {status.usage.remainingActive} seats remaining
              </p>
            )}
          </div>

          {/* Rotational Buffer */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <span>Archived (Rotational)</span>
              </div>
              <span className="font-medium">
                {status.usage.archivedSeats} / {status.tier.rotationalBuffer}
              </span>
            </div>
            <Progress 
              value={(status.usage.archivedSeats / status.tier.rotationalBuffer) * 100} 
            />
          </div>

          {/* Renewal Date */}
          {status.subscription.endDate && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Renewal Date</span>
              </div>
              <div className="text-right">
                <span className="font-medium">
                  {new Date(status.subscription.endDate).toLocaleDateString()}
                </span>
                {isNearRenewal && (
                  <p className="text-xs text-warning">{status.subscription.daysRemaining} days left</p>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {nextTier && (
              <Button 
                onClick={() => setShowUpgradeModal(true)} 
                className="flex-1"
                variant={isAtCapacity ? 'default' : 'outline'}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Upgrade to {nextTier.displayName}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <TierUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        organizationId={organizationId}
        currentTier={status.tier.name}
        onUpgradeComplete={fetchSubscriptionStatus}
      />
    </>
  );
}
