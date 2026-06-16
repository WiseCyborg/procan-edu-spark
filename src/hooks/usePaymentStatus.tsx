import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  hasPaid: boolean;
  isLoading: boolean;
  orderInfo: {
    source: 'entitlement' | 'seat';
    granted_at: string | null;
    purchase_id?: string | null;
    organization_id?: string | null;
  } | null;
}

// P5 (2026-06-16): source `hasPaid` from real access tables, not the
// vestigial `orders` table (which the current PayPal flow never writes).
// Access truth is:
//   1. course_entitlements row (status='active') — direct purchases,
//      admin grants, promo codes, AND org-seat assignments (the seat
//      trigger creates an entitlement with source='org_seat').
//   2. rvt_seats row assigned to this user for this course — covers the
//      window between seat assignment and the trigger settling, and any
//      legacy seats predating the trigger.

const PAYMENT_STALE_TIME = 5 * 60 * 1000;
const PAYMENT_GC_TIME = 30 * 60 * 1000;

export const usePaymentStatus = (courseId: string): PaymentStatus => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['payment-status', user?.id, courseId],
    queryFn: async (): Promise<{ hasPaid: boolean; orderInfo: PaymentStatus['orderInfo'] }> => {
      if (!user?.id || !courseId) return { hasPaid: false, orderInfo: null };

      // 1. course_entitlements — primary source of truth
      const { data: ent, error: entErr } = await supabase
        .from('course_entitlements')
        .select('purchased_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle();

      if (entErr) console.error('usePaymentStatus: entitlement check failed', entErr);
      if (ent) {
        return {
          hasPaid: true,
          orderInfo: { source: 'entitlement', granted_at: ent.purchased_at ?? null },
        };
      }

      // 2. rvt_seats — covers org-seat assignment before the trigger settles
      const { data: seat, error: seatErr } = await supabase
        .from('rvt_seats')
        .select('assigned_at, purchase_id, organization_id')
        .eq('assigned_user_id', user.id)
        .eq('course_id', courseId)
        .in('status', ['assigned', 'used'])
        .limit(1)
        .maybeSingle();

      if (seatErr) console.error('usePaymentStatus: seat check failed', seatErr);
      if (seat) {
        return {
          hasPaid: true,
          orderInfo: {
            source: 'seat',
            granted_at: seat.assigned_at ?? null,
            purchase_id: seat.purchase_id ?? null,
            organization_id: seat.organization_id ?? null,
          },
        };
      }

      return { hasPaid: false, orderInfo: null };
    },
    enabled: !!user?.id && !!courseId,
    staleTime: PAYMENT_STALE_TIME,
    gcTime: PAYMENT_GC_TIME,
  });

  return {
    hasPaid: data?.hasPaid ?? false,
    isLoading,
    orderInfo: data?.orderInfo ?? null,
  };
};
