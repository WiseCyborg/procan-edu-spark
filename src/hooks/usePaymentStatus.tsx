import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  hasPaid: boolean;
  isLoading: boolean;
  orderInfo: any;
}

// Cache configuration: payment status only changes on purchase
const PAYMENT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const PAYMENT_GC_TIME = 30 * 60 * 1000; // 30 minutes

export const usePaymentStatus = (courseId: string): PaymentStatus => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['payment-status', user?.id, courseId],
    queryFn: async () => {
      if (!user?.id || !courseId) {
        return { hasPaid: false, orderInfo: null };
      }

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking payment status:', error);
        return { hasPaid: false, orderInfo: null };
      }

      const paid = data && data.length > 0;
      return {
        hasPaid: paid,
        orderInfo: paid ? data[0] : null,
      };
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
