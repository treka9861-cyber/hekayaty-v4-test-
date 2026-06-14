-- ============================================================
-- SUBSCRIPTION UPGRADE SYSTEM: AUDIT LOG + IDEMPOTENCY LOCK
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add upgrade-in-progress lock column to prevent concurrent upgrades
-- (lightweight mutex for Vercel Serverless where Redis is unavailable)
ALTER TABLE creator_subscriptions
  ADD COLUMN IF NOT EXISTS upgrade_in_progress BOOLEAN DEFAULT FALSE;

-- 2. Upgrade audit trail table
-- Records every subscription lifecycle event with full proration details
CREATE TABLE IF NOT EXISTS subscription_upgrade_log (
  id                SERIAL PRIMARY KEY,
  subscription_id   INTEGER NOT NULL REFERENCES creator_subscriptions(id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL,
  event_type        TEXT NOT NULL CHECK (
    event_type IN (
      'initial_purchase',
      'upgrade',
      'renewal',
      'downgrade',
      'refund',
      'cancellation'
    )
  ),
  -- Billing cycle change details
  old_pricing_id    INTEGER REFERENCES plan_pricing(id),
  new_pricing_id    INTEGER REFERENCES plan_pricing(id),
  old_billing_cycle TEXT,
  new_billing_cycle TEXT,
  -- Period tracking
  old_period_end    TIMESTAMPTZ,
  new_period_end    TIMESTAMPTZ,
  -- Proration math (stored for audit; all calculated server-side)
  remaining_days    INTEGER,
  daily_value_cents INTEGER,
  credit_cents      INTEGER,
  new_price_cents   INTEGER,
  amount_due_cents  INTEGER,
  -- Payment info
  payment_reference TEXT,
  payment_proof_url TEXT,
  -- Extensible metadata (e.g., coupon code, promo flag, IP address)
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_sub_upgrade_log_sub_id
  ON subscription_upgrade_log(subscription_id);

CREATE INDEX IF NOT EXISTS idx_sub_upgrade_log_user_id
  ON subscription_upgrade_log(user_id);

CREATE INDEX IF NOT EXISTS idx_sub_upgrade_log_event_type
  ON subscription_upgrade_log(event_type);

CREATE INDEX IF NOT EXISTS idx_sub_upgrade_log_created_at
  ON subscription_upgrade_log(created_at DESC);

-- 4. RLS Policies
ALTER TABLE subscription_upgrade_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own upgrade history
CREATE POLICY "Users can view their own upgrade history"
  ON subscription_upgrade_log FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Only service role can insert/update (backend API uses service role key)
-- No INSERT/UPDATE policies needed for RLS (backend bypasses via service role)

-- 5. Verify the migration applied
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'creator_subscriptions'
  AND column_name = 'upgrade_in_progress';

SELECT table_name
FROM information_schema.tables
WHERE table_name = 'subscription_upgrade_log';
