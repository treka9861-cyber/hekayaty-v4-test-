/**
 * BullMQ Queue System for Async Job Processing.
 * On Vercel Serverless (or when REDIS_URL is missing), queues are disabled
 * and all jobs run synchronously via the fallback callback.
 * 
 * BullMQ requires Redis + worker_threads. Both are unavailable on Vercel Hobby/Pro
 * Serverless Functions, so we guard every instantiation carefully.
 */

const REDIS_URL = process.env.REDIS_URL || '';
const IS_VERCEL = process.env.VERCEL === '1';

// Parse the Redis URL into a connection config for BullMQ
function parsedRedisConnection() {
  if (!REDIS_URL || IS_VERCEL) return null;
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

// Dynamically import BullMQ only when Redis is available (avoids Vercel crashes)
let payoutQueue: any = null;
let notificationQueue: any = null;
let emailQueue: any = null;

const connection = parsedRedisConnection();

if (connection) {
  try {
    // Dynamic import so Vercel bundler never tries to load bullmq's worker_threads
    const { Queue } = await import('bullmq');
    payoutQueue = new Queue('payout-processing', { connection });
    notificationQueue = new Queue('notification-dispatch', { connection });
    emailQueue = new Queue('email-dispatch', { connection });
    console.log('✅ BullMQ queue system initialized');
  } catch (err: any) {
    console.warn('⚠️ BullMQ failed to initialize, running jobs synchronously:', err.message);
  }
} else {
  console.warn('⚠️ REDIS_URL not set or running on Vercel. BullMQ queues disabled — jobs will run synchronously.');
}

export { payoutQueue, notificationQueue, emailQueue };

/**
 * Enqueue a job or run the callback synchronously as a fallback.
 * This ensures the app works perfectly without Redis.
 */
export async function enqueueOrRun<T>(
  queue: any | null,
  jobName: string,
  data: T,
  fallback: () => Promise<void>
): Promise<void> {
  if (queue) {
    try {
      await queue.add(jobName, data as object, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
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
