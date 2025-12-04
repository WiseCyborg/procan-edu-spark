import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionUsage {
  activeSeats: number;
  archivedSeats: number;
  remainingActive: number;
  remainingBuffer: number;
  utilizationPercent: number;
}

interface SubscriptionTier {
  name: string;
  displayName: string;
  maxActiveSeats: number;
  rotationalBuffer: number;
  annualPriceCents: number;
  features: string[];
}

interface SubscriptionDetails {
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number | null;
  pricingType: string;
  isRotationalEnabled: boolean;
}

export interface SubscriptionStatus {
  organizationId: string;
  organizationName: string;
  tier: SubscriptionTier;
  usage: SubscriptionUsage;
  subscription: SubscriptionDetails;
}

export function useSubscriptionStatus(organizationId: string | null) {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        const { data, error: fetchError } = await supabase.rpc(
          'get_organization_subscription_status',
          { org_id: organizationId }
        );

        if (fetchError) throw fetchError;
        setStatus(data as unknown as SubscriptionStatus);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching subscription status:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Subscribe to changes
    const channel = supabase
      .channel(`subscription-status-${organizationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'organizations', filter: `id=eq.${organizationId}` },
        () => fetchStatus()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rvt_seats', filter: `organization_id=eq.${organizationId}` },
        () => fetchStatus()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const checkCapacity = async () => {
    if (!organizationId) return null;

    const { data, error } = await supabase.rpc('check_seat_capacity', {
      org_id: organizationId,
    });

    if (error) {
      console.error('Error checking capacity:', error);
      return null;
    }

    return data as unknown as {
      canAdd: boolean;
      activeSeats: number;
      maxSeats: number;
      remainingActive: number;
      message?: string;
    };
  };

  return {
    status,
    loading,
    error,
    checkCapacity,
    isNearCapacity: status ? status.usage.utilizationPercent >= 80 : false,
    isAtCapacity: status ? status.usage.remainingActive <= 0 : false,
    isNearRenewal: status?.subscription.daysRemaining !== null 
      ? status.subscription.daysRemaining <= 30 
      : false,
  };
}
