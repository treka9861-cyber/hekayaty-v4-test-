import Redis from "ioredis";

/**
 * Distributed cache layer using Redis with a robust memory fallback.
 * Essential for horizontal scaling so all Node instances share the same catalog/stats cache.
 */

// We will attempt to connect to Redis. If it fails (e.g. local dev without Redis),
// we gracefully fall back to an in-memory Map so the app doesn't crash.
const REDIS_URL = process.env.REDIS_URL || '';
const IS_VERCEL = process.env.VERCEL === '1';

let redisClient: Redis | null = null;

if (REDIS_URL && !IS_VERCEL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying, use memory fallback
        return Math.min(times * 50, 2000);
      }
    });

    redisClient.on('error', (err) => {
      console.warn("⚠️ Redis Connection Error, falling back to memory cache:", err.message);
      redisClient = null; // Force fallback
    });

    console.log("✅ Redis Cache initialized");
  } catch (err) {
    console.warn("⚠️ Failed to initialize Redis, using memory cache fallback.");
  }
}

// Memory fallback structure
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

class DistributedCache {
  private memoryStore = new Map<string, CacheEntry<any>>();

  async set<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        return;
      } catch (err) {
        // Fallback silently if Redis errors during runtime
      }
    }

    // Memory Fallback
    this.memoryStore.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (redisClient) {
      try {
        const result = await redisClient.get(key);
        if (result) return JSON.parse(result) as T;
        return null;
      } catch (err) {
        // Fallback
      }
    }

    // Memory Fallback
    const entry = this.memoryStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }

    return entry.data as T;
  }

  async delete(key: string): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (err) {}
    }
    this.memoryStore.delete(key);
  }

  async clear(): Promise<void> {
    if (redisClient) {
      try {
        await redisClient.flushdb();
        return;
      } catch (err) {}
    }
    this.memoryStore.clear();
  }
  
  // Expose the raw client for other systems (like BullMQ or connect-redis)
  getRawClient() {
    return redisClient;
  }
}

export const serverCache = new DistributedCache();
