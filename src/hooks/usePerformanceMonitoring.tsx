import { useEffect, useCallback, useRef } from 'react';
import { monitoring } from '@/lib/monitoring';

export const usePerformanceMonitoring = () => {
  const renderCount = useRef(0);
  const mountTime = useRef<number>();

  useEffect(() => {
    mountTime.current = performance.now();
    renderCount.current++;

    return () => {
      if (mountTime.current) {
        const componentLifetime = performance.now() - mountTime.current;
        monitoring.logInfo('Component Lifecycle', {
          renderCount: renderCount.current,
          lifetime: `${componentLifetime}ms`,
        });
      }
    };
  }, []);

  const trackAction = useCallback((action: string, data?: Record<string, any>) => {
    monitoring.trackUserAction(action, data);
  }, []);

  const trackError = useCallback((error: Error, context?: Record<string, any>) => {
    monitoring.logError('Component Error', error, context);
  }, []);

  const startTimer = useCallback((timerName: string) => {
    return monitoring.startPerformanceTimer(timerName);
  }, []);

  return {
    trackAction,
    trackError,
    startTimer,
    renderCount: renderCount.current,
  };
};