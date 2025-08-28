import { monitoring } from '@/lib/monitoring';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100; // Maximum number of cache entries
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
    monitoring.logInfo('Cache Set', { key, size: this.cache.size });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      monitoring.logInfo('Cache Miss', { key });
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      monitoring.logInfo('Cache Expired', { key });
      return null;
    }

    monitoring.logInfo('Cache Hit', { key });
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      monitoring.logInfo('Cache Delete', { key });
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    monitoring.logInfo('Cache Clear', { previousSize: size });
  }

  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    monitoring.logInfo('Cache Cleanup', { removed, remaining: this.cache.size });
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }

  // Cache wrapper for async functions
  async memoize<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await fn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      monitoring.logError('Cache Memoize Error', error, { key });
      throw error;
    }
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Cache hook for React components
export const useCache = () => {
  const set = <T>(key: string, data: T, ttl?: number) => cache.set(key, data, ttl);
  const get = <T>(key: string): T | null => cache.get<T>(key);
  const has = (key: string) => cache.has(key);
  const remove = (key: string) => cache.delete(key);
  const clear = () => cache.clear();
  const stats = () => cache.getStats();

  return { set, get, has, remove, clear, stats };
};