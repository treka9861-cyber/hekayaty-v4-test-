-- =====================================================
-- HEKAYATY CREATOR MEMBERSHIPS V2 - SQL MIGRATION
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. MEMBERSHIP CLUBS (1-to-1 with creator/store)
CREATE TABLE IF NOT EXISTS membership_clubs (
  id SERIAL PRIMARY KEY,
  store_id TEXT NOT NULL, -- creator's user ID
  name TEXT NOT NULL DEFAULT 'My Membership Club',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MEMBERSHIP PLANS (tiers: Bronze, Silver, Gold, etc.)
CREATE TABLE IF NOT EXISTS membership_plans (
  id SERIAL PRIMARY KEY,
  club_id INTEGER NOT NULL REFERENCES membership_clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  thumbnail_url TEXT,
  banner_url TEXT,
  badge_url TEXT,
  color_theme TEXT DEFAULT '#cca660',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PLAN PRICING (each plan can have multiple billing cycles)
CREATE TABLE IF NOT EXISTS plan_pricing (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'semi_annual', 'annual')),
  price_in_cents INTEGER NOT NULL DEFAULT 0, -- in EGP cents
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PLAN BENEFITS (the benefit catalogue for a plan)
CREATE TABLE IF NOT EXISTS plan_benefits (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES membership_plans(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- digital_access, credit, discount, exclusive_content, community, early_access
  name TEXT NOT NULL,
  value TEXT, -- e.g. "20" for 20% discount, "5" for 5 ebooks
  metadata JSONB DEFAULT '{}', -- extensible extra config
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BENEFIT SCOPES (store isolation enforcement)
CREATE TABLE IF NOT EXISTS benefit_scopes (
  id SERIAL PRIMARY KEY,
  benefit_id INTEGER NOT NULL REFERENCES plan_benefits(id) ON DELETE CASCADE,
  scope_type TEXT NOT NULL DEFAULT 'store', -- store, category, product_type, collection, series, universe, product
  scope_target_id TEXT, -- e.g. 'novels', 'physical', product ID, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BENEFIT LIMITS (usage limits per period)
CREATE TABLE IF NOT EXISTS benefit_limits (
  id SERIAL PRIMARY KEY,
  benefit_id INTEGER NOT NULL REFERENCES plan_benefits(id) ON DELETE CASCADE,
  limit_type TEXT NOT NULL DEFAULT 'unlimited' CHECK (limit_type IN ('unlimited', 'per_month', 'per_year', 'per_cycle')),
  limit_value INTEGER, -- null means unlimited
  unused_credit_behavior TEXT DEFAULT 'expire' CHECK (unused_credit_behavior IN ('expire', 'carry_over', 'limited_carry_over')),
  carry_over_limit INTEGER, -- how many can carry over
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ACTIVE SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS creator_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,   -- the subscriber
  plan_id INTEGER NOT NULL REFERENCES membership_plans(id),
  pricing_id INTEGER NOT NULL REFERENCES plan_pricing(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'paused', 'canceled')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  payment_method TEXT DEFAULT 'local', -- stripe, vodafone_cash, instapay, manual
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. ENTITLEMENTS (flattened active permissions — what app checks at runtime)
CREATE TABLE IF NOT EXISTS entitlements (
  id SERIAL PRIMARY KEY,
  subscription_id INTEGER NOT NULL REFERENCES creator_subscriptions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,   -- CRITICAL: enforces store isolation
  benefit_type TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'store',
  scope_target_id TEXT,     -- specific category, product_type, etc.
  limit_type TEXT DEFAULT 'unlimited',
  limit_value INTEGER,
  usage_count INTEGER DEFAULT 0,
  period_reset_at TIMESTAMPTZ, -- when usage resets
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. STORE CREDITS LEDGER (physical book credits, etc.)
CREATE TABLE IF NOT EXISTS store_credits (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,   -- CRITICAL: isolates credits to this store only
  plan_id INTEGER REFERENCES membership_plans(id),
  subscription_id INTEGER REFERENCES creator_subscriptions(id),
  total_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  credit_type TEXT DEFAULT 'physical_book', -- physical_book, ebook, audiobook, custom
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. CREDIT TRANSACTIONS (audit trail for credit usage)
CREATE TABLE IF NOT EXISTS credit_transactions (
  id SERIAL PRIMARY KEY,
  credit_id INTEGER NOT NULL REFERENCES store_credits(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('grant', 'use', 'expire', 'carry_over')),
  amount INTEGER NOT NULL,
  related_entity_id TEXT,   -- order ID, product ID, etc.
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. BENEFIT USAGE LOGS (analytics & tracking)
CREATE TABLE IF NOT EXISTS benefit_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  entitlement_id INTEGER REFERENCES entitlements(id),
  usage_type TEXT NOT NULL, -- discount_applied, digital_access, physical_claim, early_access
  amount_saved INTEGER DEFAULT 0,  -- in cents, for discount analytics
  related_entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_membership_clubs_store_id ON membership_clubs(store_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_club_id ON membership_plans(club_id);
CREATE INDEX IF NOT EXISTS idx_membership_plans_status ON membership_plans(status);
CREATE INDEX IF NOT EXISTS idx_plan_pricing_plan_id ON plan_pricing(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_benefits_plan_id ON plan_benefits(plan_id);
CREATE INDEX IF NOT EXISTS idx_benefit_scopes_benefit_id ON benefit_scopes(benefit_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_user_id ON creator_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_plan_id ON creator_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_creator_subscriptions_status ON creator_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_entitlements_user_store ON entitlements(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_active ON entitlements(is_active, user_id);
CREATE INDEX IF NOT EXISTS idx_store_credits_user_store ON store_credits(user_id, store_id);
CREATE INDEX IF NOT EXISTS idx_benefit_usage_logs_store ON benefit_usage_logs(store_id);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE membership_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE benefit_usage_logs ENABLE ROW LEVEL SECURITY;

-- Public can read active plans (for store public membership page)
CREATE POLICY "Public can view active membership plans"
  ON membership_plans FOR SELECT
  USING (status = 'active' AND visibility = 'public');

-- Creators can manage their own clubs
CREATE POLICY "Creators can manage their clubs"
  ON membership_clubs FOR ALL
  USING (store_id = auth.uid()::TEXT);

-- Creators can manage plans in their clubs
CREATE POLICY "Creators can manage their plans"
  ON membership_plans FOR ALL
  USING (
    club_id IN (SELECT id FROM membership_clubs WHERE store_id = auth.uid()::TEXT)
  );

-- Plan pricing readable by all, writable by club owner
CREATE POLICY "Public can read plan pricing"
  ON plan_pricing FOR SELECT USING (TRUE);

CREATE POLICY "Creators can manage plan pricing"
  ON plan_pricing FOR ALL
  USING (
    plan_id IN (
      SELECT mp.id FROM membership_plans mp
      JOIN membership_clubs mc ON mc.id = mp.club_id
      WHERE mc.store_id = auth.uid()::TEXT
    )
  );

-- Benefits readable by all
CREATE POLICY "Public can read plan benefits"
  ON plan_benefits FOR SELECT USING (TRUE);

CREATE POLICY "Creators can manage plan benefits"
  ON plan_benefits FOR ALL
  USING (
    plan_id IN (
      SELECT mp.id FROM membership_plans mp
      JOIN membership_clubs mc ON mc.id = mp.club_id
      WHERE mc.store_id = auth.uid()::TEXT
    )
  );

-- Benefit scopes & limits
CREATE POLICY "Public can read benefit scopes" ON benefit_scopes FOR SELECT USING (TRUE);
CREATE POLICY "Public can read benefit limits" ON benefit_limits FOR SELECT USING (TRUE);

CREATE POLICY "Creators can manage benefit scopes"
  ON benefit_scopes FOR ALL
  USING (
    benefit_id IN (
      SELECT pb.id FROM plan_benefits pb
      JOIN membership_plans mp ON mp.id = pb.plan_id
      JOIN membership_clubs mc ON mc.id = mp.club_id
      WHERE mc.store_id = auth.uid()::TEXT
    )
  );

CREATE POLICY "Creators can manage benefit limits"
  ON benefit_limits FOR ALL
  USING (
    benefit_id IN (
      SELECT pb.id FROM plan_benefits pb
      JOIN membership_plans mp ON mp.id = pb.plan_id
      JOIN membership_clubs mc ON mc.id = mp.club_id
      WHERE mc.store_id = auth.uid()::TEXT
    )
  );

-- Subscriptions: users see their own
CREATE POLICY "Users can see their own subscriptions"
  ON creator_subscriptions FOR SELECT
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can insert subscriptions"
  ON creator_subscriptions FOR INSERT
  WITH CHECK (user_id = auth.uid()::TEXT);

-- Entitlements: users see their own
CREATE POLICY "Users can see their own entitlements"
  ON entitlements FOR SELECT
  USING (user_id = auth.uid()::TEXT);

-- Credits: users see their own
CREATE POLICY "Users can see their own credits"
  ON store_credits FOR SELECT
  USING (user_id = auth.uid()::TEXT);

CREATE POLICY "Users can see their credit transactions"
  ON credit_transactions FOR SELECT
  USING (
    credit_id IN (SELECT id FROM store_credits WHERE user_id = auth.uid()::TEXT)
  );

-- =====================================================
-- HELPER FUNCTION: Provision entitlements after subscribe
-- =====================================================
CREATE OR REPLACE FUNCTION provision_entitlements(p_subscription_id INTEGER)
RETURNS VOID AS $$
DECLARE
  sub RECORD;
  benefit RECORD;
  bscope RECORD;
  blimit RECORD;
BEGIN
  SELECT cs.*, mp.club_id, mc.store_id
  INTO sub
  FROM creator_subscriptions cs
  JOIN membership_plans mp ON mp.id = cs.plan_id
  JOIN membership_clubs mc ON mc.id = mp.club_id
  WHERE cs.id = p_subscription_id;

  -- Delete old entitlements for this subscription
  DELETE FROM entitlements WHERE subscription_id = p_subscription_id;

  -- Re-provision from all active plan benefits
  FOR benefit IN
    SELECT pb.* FROM plan_benefits pb WHERE pb.plan_id = sub.plan_id AND pb.is_active = TRUE
  LOOP
    SELECT * INTO bscope FROM benefit_scopes WHERE benefit_id = benefit.id LIMIT 1;
    SELECT * INTO blimit FROM benefit_limits WHERE benefit_id = benefit.id LIMIT 1;

    INSERT INTO entitlements (
      subscription_id, user_id, store_id,
      benefit_type, scope_type, scope_target_id,
      limit_type, limit_value, usage_count, period_reset_at, is_active
    ) VALUES (
      p_subscription_id,
      sub.user_id,
      sub.store_id,
      benefit.type,
      COALESCE(bscope.scope_type, 'store'),
      bscope.scope_target_id,
      COALESCE(blimit.limit_type, 'unlimited'),
      blimit.limit_value,
      0,
      sub.current_period_end,
      TRUE
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
