import * as Sentry from '@sentry/react';
import { onCLS, onINP, onFCP, onLCP, onTTFB } from 'web-vitals';

// Performance monitoring and error tracking
export class ProductionMonitoring {
  private static instance: ProductionMonitoring;
  private metrics: Map<string, number> = new Map();

  static getInstance(): ProductionMonitoring {
    if (!ProductionMonitoring.instance) {
      ProductionMonitoring.instance = new ProductionMonitoring();
    }
    return ProductionMonitoring.instance;
  }

  // Initialize monitoring systems
  initialize() {
    this.initSentry();
    this.initPerformanceTracking();
    this.initErrorTracking();
  }

  private initSentry() {
    if (import.meta.env.PROD) {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: 'production',
        tracesSampleRate: 0.1,
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
        replaysSessionSampleRate: 0.1,
        replaysOnErrorSampleRate: 1.0,
      });
    }
  }

  private initPerformanceTracking() {
    // Track Core Web Vitals
    onCLS(this.reportMetric);
    onINP(this.reportMetric); // Replaced FID with INP in web-vitals v3+
    onFCP(this.reportMetric);
    onLCP(this.reportMetric);
    onTTFB(this.reportMetric);
  }

  private initErrorTracking() {
    window.addEventListener('error', this.handleGlobalError.bind(this));
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
  }

  private reportMetric = (metric: any) => {
    this.metrics.set(metric.name, metric.value);
    console.log(`[Performance] ${metric.name}: ${metric.value}`);
    
    // Send to analytics
    if (import.meta.env.PROD) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${metric.name}: ${metric.value}`,
        level: 'info',
      });
    }
  };

  private handleGlobalError(error: ErrorEvent) {
    this.logError('Global Error', error.error);
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    this.logError('Unhandled Promise Rejection', event.reason);
  }

  // Structured logging methods
  logError(message: string, error: any, context: Record<string, any> = {}) {
    const errorData = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    console.error('[Production Error]', errorData);
    
    if (import.meta.env.PROD) {
      Sentry.captureException(error, {
        contexts: { additional: context },
        tags: { source: 'frontend' },
      });
    }
  }

  logInfo(message: string, data: Record<string, any> = {}) {
    const logData = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };

    console.log('[Production Info]', logData);
  }

  logWarning(message: string, data: Record<string, any> = {}) {
    const logData = {
      level: 'warning',
      message,
      timestamp: new Date().toISOString(),
      ...data,
    };

    console.warn('[Production Warning]', logData);
    
    if (import.meta.env.PROD) {
      Sentry.captureMessage(message, 'warning');
    }
  }

  // Performance tracking methods
  startPerformanceTimer(name: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = performance.now() - start;
      this.metrics.set(name, duration);
      this.logInfo(`Performance Timer: ${name}`, { duration: `${duration}ms` });
    };
  }

  trackUserAction(action: string, data: Record<string, any> = {}) {
    this.logInfo(`User Action: ${action}`, data);
  }

  // Health check method
  getHealthStatus() {
    return {
      timestamp: new Date().toISOString(),
      status: 'healthy',
      metrics: Object.fromEntries(this.metrics),
      version: import.meta.env.VITE_APP_VERSION || 'unknown',
    };
  }

  // Memory usage tracking
  trackMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryData = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
      
      this.logInfo('Memory Usage', memoryData);
      return memoryData;
    }
    return null;
  }
}

// Export singleton instance
export const monitoring = ProductionMonitoring.getInstance();