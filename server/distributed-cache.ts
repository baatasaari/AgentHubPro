// Distributed Cache Implementation for AgentHub Platform
// Replaces transient in-memory caches with production-ready distributed caching

import config from './config.js';
import memjs from 'memjs';

interface CacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<boolean>;
  delete(key: string): Promise<boolean>;
  flush(): Promise<boolean>;
}

// Memcached implementation for distributed caching
class MemcachedClient implements CacheClient {
  private client: memjs.Client;

  constructor() {
    const servers = config.cache.memcached.servers || 'localhost:11211';
    this.client = memjs.Client.create(servers, {
      username: config.cache.memcached.username,
      password: config.cache.memcached.password,
      timeout: config.cache.memcached.timeout || 1000,
      retries: 2
    });
    
    console.log(`💾 Distributed Cache: Memcached (${servers})`);
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.get(key);
      return result.value ? result.value.toString() : null;
    } catch (error) {
      console.error(`Cache GET error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<boolean> {
    try {
      const result = await this.client.set(key, value, { expires: ttl });
      return result;
    } catch (error) {
      console.error(`Cache SET error for key ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.client.delete(key);
      return result;
    } catch (error) {
      console.error(`Cache DELETE error for key ${key}:`, error);
      return false;
    }
  }

  async flush(): Promise<boolean> {
    try {
      await this.client.flush();
      return true;
    } catch (error) {
      console.error('Cache FLUSH error:', error);
      return false;
    }
  }
}

// Fallback in-memory cache for development
class InMemoryClient implements CacheClient {
  private cache: Map<string, { value: string; expires: number }> = new Map();

  constructor() {
    console.log('💾 Distributed Cache: In-Memory (Development Mode)');
    
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expires && entry.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<boolean> {
    const expires = ttl > 0 ? Date.now() + (ttl * 1000) : 0;
    this.cache.set(key, { value, expires });
    return true;
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async flush(): Promise<boolean> {
    this.cache.clear();
    return true;
  }
}

// High-level cache abstraction with typed methods
export class DistributedCache {
  private client: CacheClient;

  constructor() {
    // Auto-detect cache backend
    if (config.cache.memcached.enabled) {
      this.client = new MemcachedClient();
    } else {
      this.client = new InMemoryClient();
    }
  }

  // Embedding cache operations
  async getEmbedding(textHash: string): Promise<number[] | null> {
    const key = `embedding:${textHash}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setEmbedding(textHash: string, embedding: number[], ttl: number = 86400): Promise<boolean> {
    const key = `embedding:${textHash}`;
    return await this.client.set(key, JSON.stringify(embedding), ttl);
  }

  // RAG knowledge base cache
  async getKnowledgeBase(customerId: string): Promise<any | null> {
    const key = `rag:kb:${customerId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setKnowledgeBase(customerId: string, knowledgeBase: any, ttl: number = 3600): Promise<boolean> {
    const key = `rag:kb:${customerId}`;
    return await this.client.set(key, JSON.stringify(knowledgeBase), ttl);
  }

  async invalidateKnowledgeBase(customerId: string): Promise<boolean> {
    const key = `rag:kb:${customerId}`;
    return await this.client.delete(key);
  }

  // Agent configuration cache
  async getAgentConfig(agentId: number): Promise<any | null> {
    const key = `agent:config:${agentId}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setAgentConfig(agentId: number, config: any, ttl: number = 1800): Promise<boolean> {
    const key = `agent:config:${agentId}`;
    return await this.client.set(key, JSON.stringify(config), ttl);
  }

  async invalidateAgentConfig(agentId: number): Promise<boolean> {
    const key = `agent:config:${agentId}`;
    return await this.client.delete(key);
  }

  // User session cache (for faster lookups)
  async getUserSession(sessionToken: string): Promise<any | null> {
    const key = `session:${sessionToken}`;
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async setUserSession(sessionToken: string, sessionData: any, ttl: number = 86400): Promise<boolean> {
    const key = `session:${sessionToken}`;
    return await this.client.set(key, JSON.stringify(sessionData), ttl);
  }

  async invalidateUserSession(sessionToken: string): Promise<boolean> {
    const key = `session:${sessionToken}`;
    return await this.client.delete(key);
  }

  // API rate limiting cache
  async getRateLimit(identifier: string): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const cached = await this.client.get(key);
    return cached ? parseInt(cached) : 0;
  }

  async incrementRateLimit(identifier: string, ttl: number = 3600): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const current = await this.getRateLimit(identifier);
    const newCount = current + 1;
    await this.client.set(key, newCount.toString(), ttl);
    return newCount;
  }

  // Generic cache operations
  async get<T>(key: string): Promise<T | null> {
    const cached = await this.client.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<boolean> {
    return await this.client.set(key, JSON.stringify(value), ttl);
  }

  async delete(key: string): Promise<boolean> {
    return await this.client.delete(key);
  }

  async flush(): Promise<boolean> {
    return await this.client.flush();
  }

  // Batch operations for performance
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const promises = keys.map(key => this.get<T>(key));
    return await Promise.all(promises);
  }

  async mset<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<boolean[]> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.value, entry.ttl)
    );
    return await Promise.all(promises);
  }

  // Cache warming for frequently accessed data
  async warmUserCache(userId: number): Promise<void> {
    try {
      // Pre-load user data into cache
      const { persistentStorage } = await import('./persistent-storage.js');
      
      const user = await persistentStorage.getUser(userId);
      if (user) {
        await this.set(`user:${userId}`, user, 1800);
        
        // Pre-load user's agents
        const agents = await persistentStorage.getAgentsByUser(userId);
        await this.set(`user:${userId}:agents`, agents, 900);
        
        // Pre-load user permissions
        const permissions = await persistentStorage.getUserPermissions(userId);
        await this.set(`user:${userId}:permissions`, permissions, 1800);
      }
    } catch (error) {
      console.error(`Failed to warm cache for user ${userId}:`, error);
    }
  }

  // Cache statistics
  async getStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
  }> {
    // This would be implemented based on the cache backend's stats
    // For now, return placeholder stats
    return {
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }
}

// Create and export the distributed cache instance
export const distributedCache = new DistributedCache();

// Helper function to create cache keys with consistent patterns
export function createCacheKey(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}:${parts.join(':')}`;
}

// Cache TTL constants
export const CacheTTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes  
  LONG: 3600,      // 1 hour
  DAILY: 86400,    // 24 hours
  WEEKLY: 604800   // 7 days
} as const;