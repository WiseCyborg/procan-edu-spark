import { supabase } from '@/integrations/supabase/client';
import { monitoring } from '@/lib/monitoring';
import { cache } from '@/lib/cache';

interface QueryOptions {
  cacheKey?: string;
  cacheTTL?: number;
  timeout?: number;
  retries?: number;
}

class DatabaseOptimizer {
  private defaultTimeout = 10000; // 10 seconds
  private defaultRetries = 3;

  // Optimized query wrapper with caching and monitoring
  async query<T>(
    queryFn: () => Promise<{ data: T | null; error: any }>,
    options: QueryOptions = {}
  ): Promise<{ data: T | null; error: any }> {
    const { 
      cacheKey, 
      cacheTTL = 5 * 60 * 1000, 
      timeout = this.defaultTimeout,
      retries = this.defaultRetries 
    } = options;

    // Check cache first
    if (cacheKey) {
      const cached = cache.get<T>(cacheKey);
      if (cached !== null) {
        return { data: cached, error: null };
      }
    }

    const endTimer = monitoring.startPerformanceTimer(`DB Query: ${cacheKey || 'unnamed'}`);
    let lastError: any;

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await this.executeWithTimeout(queryFn(), timeout);
        endTimer();

        // Cache successful results
        if (!result.error && result.data && cacheKey) {
          cache.set(cacheKey, result.data, cacheTTL);
        }

        // Log query performance
        monitoring.logInfo('Database Query Success', {
          cacheKey,
          attempt: attempt + 1,
          cached: false,
        });

        return result;
      } catch (error) {
        lastError = error;
        monitoring.logWarning(`Database Query Attempt ${attempt + 1} Failed`, {
          cacheKey,
          error: error.message,
        });

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    endTimer();
    monitoring.logError('Database Query Failed', lastError, {
      cacheKey,
      totalAttempts: retries + 1,
    });

    return { data: null, error: lastError };
  }

  // Batch operations for better performance
  async batchInsert<T extends Record<string, any>>(
    table: string,
    records: T[],
    batchSize = 100
  ): Promise<{ success: boolean; errors: any[] }> {
    const errors: any[] = [];
    const batches = this.chunkArray(records, batchSize);

    monitoring.logInfo('Batch Insert Started', {
      table,
      totalRecords: records.length,
      batchCount: batches.length,
    });

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      try {
        // Use dynamic table access
        const { error } = await (supabase as any).from(table).insert(batch);
        if (error) {
          errors.push({ batch: i + 1, error });
        }
      } catch (error) {
        errors.push({ batch: i + 1, error });
      }
    }

    const success = errors.length === 0;
    monitoring.logInfo('Batch Insert Completed', {
      table,
      success,
      errorCount: errors.length,
    });

    return { success, errors };
  }

  // Connection health monitoring
  async monitorConnectionHealth(): Promise<{
    healthy: boolean;
    latency: number;
    activeConnections?: number;
  }> {
    const start = performance.now();
    
    try {
      const { error } = await supabase
        .from('courses')
        .select('id')
        .limit(1);

      const latency = performance.now() - start;
      const healthy = !error;

      monitoring.logInfo('Connection Health Check', {
        healthy,
        latency: `${latency}ms`,
      });

      return { healthy, latency };
    } catch (error) {
      const latency = performance.now() - start;
      monitoring.logError('Connection Health Check Failed', error);
      return { healthy: false, latency };
    }
  }

  // Query performance analysis
  async analyzeQueryPerformance(
    queryName: string,
    queryFn: () => Promise<any>,
    iterations = 5
  ) {
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        await queryFn();
        results.push(performance.now() - start);
      } catch (error) {
        monitoring.logError(`Query Performance Test ${i + 1} Failed`, error);
        results.push(-1); // Mark as failed
      }
    }

    const validResults = results.filter(r => r > 0);
    const stats = {
      queryName,
      iterations,
      successRate: (validResults.length / iterations) * 100,
      avgTime: validResults.length ? validResults.reduce((a, b) => a + b) / validResults.length : 0,
      minTime: Math.min(...validResults),
      maxTime: Math.max(...validResults),
    };

    monitoring.logInfo('Query Performance Analysis', stats);
    return stats;
  }

  // Helper methods
  private executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const dbOptimizer = new DatabaseOptimizer();

// Commonly used optimized queries
export const optimizedQueries = {
  // Get user progress with caching
  getUserProgress: async (userId: string) =>
    await dbOptimizer.query(
      async () =>
        await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', userId),
      {
        cacheKey: `user_progress_${userId}`,
        cacheTTL: 2 * 60 * 1000, // 2 minutes
      }
    ),

  // Get course modules with caching
  getCourseModules: async (courseId: string) =>
    await dbOptimizer.query(
      async () =>
        await supabase
          .from('course_modules')
          .select('*')
          .eq('course_id', courseId)
          .eq('is_active', true)
          .order('module_number'),
      {
        cacheKey: `course_modules_${courseId}`,
        cacheTTL: 10 * 60 * 1000, // 10 minutes
      }
    ),

  // Get user certificates with caching
  getUserCertificates: async (userId: string) =>
    await dbOptimizer.query(
      async () =>
        await supabase
          .from('certificates')
          .select('*, courses(title)')
          .eq('user_id', userId)
          .order('issue_date', { ascending: false }),
      {
        cacheKey: `user_certificates_${userId}`,
        cacheTTL: 5 * 60 * 1000, // 5 minutes
      }
    ),
};