import { Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";

/**
 * BullMQ Worker — processes background jobs outside the HTTP request lifecycle.
 * Uses a parsed connection config to avoid ioredis version conflicts.
 */

const REDIS_URL = process.env.REDIS_URL || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!REDIS_URL) {
  console.warn("⚠️ REDIS_URL not set. Worker will not start.");
  process.exit(0);
}

// Parse Redis URL into a plain config — BullMQ uses its own ioredis internally
function parsedRedisConnection() {
  try {
    const url = new URL(REDIS_URL);
    const isTLS = url.protocol === 'rediss:';
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
      tls: isTLS ? {} : undefined,
      maxRetriesPerRequest: null as null,
    };
  } catch {
    console.error("❌ Invalid REDIS_URL. Worker cannot start.");
    process.exit(1);
  }
}

const connection = parsedRedisConnection()!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Payout Worker ───────────────────────────────────────────────────────────
new Worker(
  "payout-processing",
  async (job) => {
    const { orderId, earningsByCreator } = job.data as {
      orderId: number;
      earningsByCreator: Record<string, number>;
    };

    console.log(`[Worker] Processing payouts for order #${orderId}`);

    for (const [creatorId, amount] of Object.entries(earningsByCreator)) {
      const { error } = await supabase.from("earnings").insert({
        creator_id: creatorId,
        order_id: orderId,
        amount,
        status: "pending",
      });
      if (error) {
        console.error(`[Worker] Failed earning for creator ${creatorId}:`, error.message);
        throw error; // Triggers BullMQ retry
      }
    }

    console.log(`[Worker] ✅ Payouts processed for order #${orderId}`);
  },
  { connection }
);

// ─── Notification Worker ─────────────────────────────────────────────────────
new Worker(
  "notification-dispatch",
  async (job) => {
    const { userId, type, title, message, metadata } = job.data as {
      userId: string;
      type: string;
      title: string;
      message: string;
      metadata?: Record<string, unknown>;
    };

    console.log(`[Worker] Dispatching notification to user ${userId}`);

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      type,
      title,
      message,
      metadata,
      is_read: false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("[Worker] Notification insert failed:", error.message);
      throw error;
    }

    console.log(`[Worker] ✅ Notification sent to ${userId}`);
  },
  { connection }
);

console.log("🚀 Hekayaty Worker started — listening for jobs...");
