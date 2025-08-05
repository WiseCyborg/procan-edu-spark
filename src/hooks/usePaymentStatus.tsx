import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface PaymentStatus {
  hasPaid: boolean;
  isLoading: boolean;
  orderInfo: any;
}

export const usePaymentStatus = (courseId: string): PaymentStatus => {
  const { user } = useAuth();
  const [hasPaid, setHasPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orderInfo, setOrderInfo] = useState(null);

  useEffect(() => {
    if (!user || !courseId) {
      setIsLoading(false);
      return;
    }

    checkPaymentStatus();
  }, [user, courseId]);

  const checkPaymentStatus = async () => {
    if (!user || !courseId) return;

    try {
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
        return;
      }

      const paid = data && data.length > 0;
      setHasPaid(paid);
      setOrderInfo(paid ? data[0] : null);
    } catch (error) {
      console.error('Error in checkPaymentStatus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { hasPaid, isLoading, orderInfo };
};