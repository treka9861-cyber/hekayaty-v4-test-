-- ============================================================
-- SUBSCRIPTION UPGRADE REQUESTS TABLE
-- Run this in your Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_upgrade_requests (
  id                          SERIAL PRIMARY KEY,
  subscription_id             INTEGER NOT NULL REFERENCES creator_subscriptions(id) ON DELETE CASCADE,
  user_id                     TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),

  -- Cycle details at submission time
  current_pricing_id          INTEGER NOT NULL REFERENCES plan_pricing(id),
  target_pricing_id           INTEGER NOT NULL REFERENCES plan_pricing(id),
  current_billing_cycle       TEXT NOT NULL,
  target_billing_cycle        TEXT NOT NULL,

  -- Proration snapshot at submission (display only; recalculated at approval)
  snapshot_remaining_days     INTEGER,
  snapshot_credit_cents       INTEGER,
  snapshot_amount_due_cents   INTEGER,
  snapshot_new_period_end     TIMESTAMPTZ,
  snapshot_bonus_days         INTEGER DEFAULT 0,

  -- Payment info provided by user
  payment_method              TEXT,
  payment_reference           TEXT,
  payment_proof_url           TEXT,

  -- Admin action
  reviewed_by                 TEXT,
  reviewed_at                 TIMESTAMPTZ,
  rejection_reason            TEXT,

  -- Timestamps
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- Enforce: only one pending request per subscription at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_upgrade_req_pending_unique
  ON subscription_upgrade_requests(subscription_id)
  WHERE status = 'pending';

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_upgrade_req_user_id      ON subscription_upgrade_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_req_status       ON subscription_upgrade_requests(status);
CREATE INDEX IF NOT EXISTS idx_upgrade_req_sub_id       ON subscription_upgrade_requests(subscription_id);
CREATE INDEX IF NOT EXISTS idx_upgrade_req_created_at   ON subscription_upgrade_requests(created_at DESC);

-- RLS
ALTER TABLE subscription_upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own upgrade requests" ON subscription_upgrade_requests;
CREATE POLICY "Users can view their own upgrade requests"
  ON subscription_upgrade_requests FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name = 'subscription_upgrade_requests';
