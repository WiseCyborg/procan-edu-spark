import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmailCircuitBreaker {
  id: string;
  circuit_state: string;
  failure_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  half_open_at: string | null;
  closed_at: string | null;
  updated_at: string;
}

export const useEmailHealthMonitor = () => {
  const [circuitBreaker, setCircuitBreaker] = useState<EmailCircuitBreaker | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCircuitBreaker = async () => {
    try {
      const { data, error } = await supabase
        .from('email_circuit_breaker')
        .select('*')
        .single();

      if (error) throw error;
      setCircuitBreaker(data);
    } catch (error) {
      console.error('Error fetching circuit breaker:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCircuitBreaker();

    // Poll every 5 seconds
    const interval = setInterval(fetchCircuitBreaker, 5000);

    return () => clearInterval(interval);
  }, []);

  return { circuitBreaker, loading, refresh: fetchCircuitBreaker };
};
