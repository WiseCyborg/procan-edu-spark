import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { TierUpgradeModal } from './TierUpgradeModal';

interface SeatCapacityBannerProps {
  organizationId: string;
}

interface CapacityStatus {
  canAdd: boolean;
  activeSeats: number;
  maxSeats: number;
  remainingActive: number;
  tier: string;
  message?: string;
}

export function SeatCapacityBanner({ organizationId }: SeatCapacityBannerProps) {
  const [capacity, setCapacity] = useState<CapacityStatus | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    const fetchCapacity = async () => {
      const { data, error } = await supabase.rpc('check_seat_capacity', {
        org_id: organizationId,
      });

      if (!error && data) {
        setCapacity(data as unknown as CapacityStatus);
      }
    };

    fetchCapacity();

    // Subscribe to seat changes
    const channel = supabase
      .channel('seat-capacity-banner')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rvt_seats', filter: `organization_id=eq.${organizationId}` },
        () => fetchCapacity()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  if (!capacity) return null;

  const utilizationPercent = (capacity.activeSeats / capacity.maxSeats) * 100;

  // Don't show banner if under 80% capacity
  if (utilizationPercent < 80) return null;

  const isAtCapacity = !capacity.canAdd;

  return (
    <>
      <Alert variant={isAtCapacity ? 'destructive' : 'default'} className="mb-4">
        {isAtCapacity ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Users className="h-4 w-4" />
        )}
        <AlertTitle>
          {isAtCapacity ? 'Seat Limit Reached' : 'Approaching Seat Limit'}
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span>
            {isAtCapacity
              ? 'You cannot add more employees. Upgrade your tier or archive inactive users to free seats.'
              : `Only ${capacity.remainingActive} seat${capacity.remainingActive !== 1 ? 's' : ''} remaining. Consider upgrading before reaching capacity.`}
          </span>
          <Button
            size="sm"
            variant={isAtCapacity ? 'default' : 'outline'}
            onClick={() => setShowUpgradeModal(true)}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Upgrade Tier
          </Button>
        </AlertDescription>
      </Alert>

      <TierUpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        organizationId={organizationId}
        currentTier={capacity.tier}
        onUpgradeComplete={() => {
          // Refresh will happen via realtime subscription
        }}
      />
    </>
  );
}
