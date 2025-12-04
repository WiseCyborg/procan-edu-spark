import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { SUBSCRIPTION_TIERS, formatPrice, calculateProration } from '@/config/subscription-tiers';
import { Check, Crown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface TierUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  currentTier: string;
  daysRemaining?: number;
  onUpgradeComplete?: () => void;
}

export function TierUpgradeModal({
  open,
  onOpenChange,
  organizationId,
  currentTier,
  daysRemaining = 365,
  onUpgradeComplete,
}: TierUpgradeModalProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const currentTierIndex = SUBSCRIPTION_TIERS.findIndex(t => t.tierName === currentTier);
  const availableTiers = SUBSCRIPTION_TIERS.filter((_, index) => index > currentTierIndex);

  const handleUpgrade = async () => {
    if (!selectedTier) return;

    setUpgrading(true);
    try {
      const { data, error } = await supabase.rpc('upgrade_subscription_tier', {
        org_id: organizationId,
        new_tier_name: selectedTier,
        payment_ref: `upgrade-${Date.now()}`,
        performed_by_id: (await supabase.auth.getUser()).data.user?.id,
      });

      if (error) throw error;

      const result = data as unknown as { success: boolean; error?: string; newTier?: string };
      
      if (result.success) {
        toast.success('Subscription upgraded successfully', {
          description: `You are now on the ${result.newTier} tier`,
        });
        onUpgradeComplete?.();
        onOpenChange(false);
      } else {
        throw new Error(result.error || 'Upgrade failed');
      }
    } catch (error: any) {
      console.error('Error upgrading:', error);
      toast.error('Failed to upgrade subscription', {
        description: error.message,
      });
    } finally {
      setUpgrading(false);
    }
  };

  const currentTierData = SUBSCRIPTION_TIERS.find(t => t.tierName === currentTier);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Upgrade Your Subscription
          </DialogTitle>
          <DialogDescription>
            Choose a tier that fits your organization's needs. Upgrades take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-4">
          {availableTiers.map((tier) => {
            const proration = currentTierData 
              ? calculateProration(currentTierData.annualPriceCents, tier.annualPriceCents, daysRemaining)
              : tier.annualPriceCents;
            const isSelected = selectedTier === tier.tierName;

            return (
              <Card
                key={tier.id}
                className={`cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : 'hover:border-primary/50'
                } ${tier.isPopular ? 'relative' : ''}`}
                onClick={() => setSelectedTier(tier.tierName)}
              >
                {tier.isPopular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardContent className="pt-6">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg">{tier.displayName}</h3>
                    <div className="mt-2">
                      <span className="text-3xl font-bold">{formatPrice(tier.annualPriceCents)}</span>
                      <span className="text-muted-foreground">/year</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatPrice(tier.monthlyEquivalentCents)}/month equivalent
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Active Seats</span>
                      <span className="font-medium">{tier.maxActiveSeats}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Rotational Buffer</span>
                      <span className="font-medium">+{tier.rotationalBuffer}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm mb-4">
                    {tier.features.slice(0, 5).map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {tier.features.length > 5 && (
                      <li className="text-muted-foreground text-xs">
                        +{tier.features.length - 5} more features
                      </li>
                    )}
                  </ul>

                  {proration > 0 && daysRemaining < 365 && (
                    <div className="text-center text-sm border-t pt-3">
                      <span className="text-muted-foreground">Prorated today: </span>
                      <span className="font-medium text-primary">{formatPrice(proration)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={upgrading}>
            Cancel
          </Button>
          <Button onClick={handleUpgrade} disabled={!selectedTier || upgrading}>
            {upgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {selectedTier 
              ? `Upgrade to ${SUBSCRIPTION_TIERS.find(t => t.tierName === selectedTier)?.displayName}`
              : 'Select a Tier'
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
