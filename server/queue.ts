import { Queue } from "bullmq";

/**
 * BullMQ Queue System for Async Job Processing.
 * Uses a plain connection config so BullMQ uses its own bundled ioredis
 * internally — avoids type conflicts with the external ioredis package.
 */

const REDIS_URL = process.env.REDIS_URL || '';

// Parse the Redis URL into a { host, port, password, tls } config object
// that BullMQ's internal ioredis can accept without type conflicts.
function parsedRedisConnection() {
  if (!REDIS_URL) return null;
  try {
    const url = new URL(REDIS_URL);
    const isTLS = url.protocol === 'rediss:';
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: isTLS ? {} : undefined,
      maxRetriesPerRequest: null as null, // Required by BullMQ
    };
  } catch {
    return null;
  }
}

const connection = parsedRedisConnection();

if (connection) {
  console.log("✅ BullMQ queue system initialized");
} else {
  console.warn("⚠️ REDIS_URL not set. BullMQ queues disabled — jobs will run synchronously.");
}

// Define Queues (null if Redis unavailable)
export const payoutQueue = connection
  ? new Queue("payout-processing", { connection })
  : null;

export const notificationQueue = connection
  ? new Queue("notification-dispatch", { connection })
  : null;

export const emailQueue = connection
  ? new Queue("email-dispatch", { connection })
  : null;

/**
 * Enqueue a job or run the callback synchronously as a fallback.
 * This ensures the app works perfectly in dev without Redis.
 */
export async function enqueueOrRun<T>(
  queue: Queue | null,
  jobName: string,
  data: T,
  fallback: () => Promise<void>
): Promise<void> {
  if (queue) {
    try {
      await queue.add(jobName, data as object, {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 200,
      });
      return;
    } catch (err) {
      console.warn(`⚠️ Failed to enqueue "${jobName}", running synchronously:`, (err as Error).message);
    }
  }
  // Synchronous fallback
  await fallback();
}
