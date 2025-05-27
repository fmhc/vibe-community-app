import { logger } from './logger.server';

// Cache configuration
interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items in cache
  cleanupInterval: number; // How often to clean up expired items
}

interface CacheItem<T> {
  value: T;
  expiry: number;
  hits: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private stats = { hits: 0, misses: 0 };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config
    };

    // Start cleanup timer
    this.startCleanup();
    
    logger.info('Memory cache initialized', {
      service: 'cache',
      method: 'constructor',
      config: this.config
    });
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        removed++;
      }
    }

    // If still over max size, remove least recently used items
    if (this.cache.size > this.config.maxSize) {
      const sortedEntries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

      const toRemove = this.cache.size - this.config.maxSize;
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(sortedEntries[i][0]);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug('Cache cleanup completed', {
        service: 'cache',
        method: 'cleanup',
        removed,
        currentSize: this.cache.size
      });
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.config.defaultTTL);
    
    this.cache.set(key, {
      value,
      expiry,
      hits: 0,
      lastAccessed: Date.now()
    });

    logger.debug('Cache item set', {
      service: 'cache',
      method: 'set',
      key,
      ttl: ttl || this.config.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      logger.debug('Cache miss', {
        service: 'cache',
        method: 'get',
        key
      });
      return null;
    }

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      logger.debug('Cache expired', {
        service: 'cache',
        method: 'get',
        key
      });
      return null;
    }

    // Update access stats
    item.hits++;
    item.lastAccessed = Date.now();
    this.stats.hits++;

    logger.debug('Cache hit', {
      service: 'cache',
      method: 'get',
      key,
      hits: item.hits
    });

    return item.value;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug('Cache item deleted', {
        service: 'cache',
        method: 'delete',
        key
      });
    }

    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
    
    logger.info('Cache cleared', {
      service: 'cache',
      method: 'clear',
      itemsRemoved: size
    });
  }

  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0
    };
  }

  // Wrapper for caching function results
  async cached<T>(
    key: string,
    fn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;

    this.set(key, result, ttl);

    logger.performance('cache_function', duration, {
      key,
      cached: false
    });

    return result;
  }

  shutdown(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
    
    logger.info('Cache shutdown completed', {
      service: 'cache',
      method: 'shutdown'
    });
  }
}

// Create cache instances for different data types
export const directusCache = new MemoryCache({
  defaultTTL: 10 * 60 * 1000, // 10 minutes for user data
  maxSize: 500
});

export const emailCache = new MemoryCache({
  defaultTTL: 60 * 60 * 1000, // 1 hour for email templates
  maxSize: 100
});

export const mattermostCache = new MemoryCache({
  defaultTTL: 30 * 60 * 1000, // 30 minutes for Mattermost data
  maxSize: 200
});

export const analyticsCache = new MemoryCache({
  defaultTTL: 5 * 60 * 1000, // 5 minutes for analytics
  maxSize: 50
});

// Cache key generators
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userByEmail: (email: string) => `user:email:${email}`,
  emailTemplate: (templateId: string, locale: string) => `email:template:${templateId}:${locale}`,
  mattermostUser: (email: string) => `mattermost:user:${email}`,
  mattermostChannels: (teamId: string) => `mattermost:channels:${teamId}`,
  analytics: (type: string, period: string) => `analytics:${type}:${period}`,
  eventsList: (filters: string) => `events:list:${filters}`,
  campaignStats: (campaignId: string) => `campaign:stats:${campaignId}`
};

// Utility functions for common caching patterns
export async function withCache<T>(
  cache: MemoryCache,
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return cache.cached(key, fn, ttl);
}

// Batch cache operations
export function invalidateUserCache(userId: string): void {
  directusCache.delete(cacheKeys.user(userId));
  logger.debug('User cache invalidated', {
    service: 'cache',
    method: 'invalidateUserCache',
    userId
  });
}

export function invalidateEmailCache(email: string): void {
  directusCache.delete(cacheKeys.userByEmail(email));
  mattermostCache.delete(cacheKeys.mattermostUser(email));
  logger.debug('Email-related cache invalidated', {
    service: 'cache',
    method: 'invalidateEmailCache',
    email: email.split('@')[0] + '@***'
  });
}

// Cache warming functions
export async function warmDirectusCache(): Promise<void> {
  try {
    logger.info('Starting Directus cache warming', {
      service: 'cache',
      method: 'warmDirectusCache'
    });

    // Pre-load frequently accessed data
    // This would be implemented based on actual usage patterns
    
    logger.info('Directus cache warming completed', {
      service: 'cache',
      method: 'warmDirectusCache'
    });
  } catch (error) {
    logger.serviceError('cache', 'warmDirectusCache', 'Cache warming failed', error as Error);
  }
}

// Cache monitoring and stats collection
export function getCacheStats(): Record<string, CacheStats> {
  return {
    directus: directusCache.getStats(),
    email: emailCache.getStats(),
    mattermost: mattermostCache.getStats(),
    analytics: analyticsCache.getStats()
  };
}

// Graceful shutdown
export function shutdownCaches(): void {
  directusCache.shutdown();
  emailCache.shutdown();
  mattermostCache.shutdown();
  analyticsCache.shutdown();
  
  logger.info('All caches shut down', {
    service: 'cache',
    method: 'shutdownCaches'
  });
}

// Export the main cache instance for general use
export { MemoryCache }; 