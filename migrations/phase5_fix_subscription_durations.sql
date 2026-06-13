-- ============================================================
-- SUBSCRIPTION DURATION BUG FIX: RECALCULATE EXISTING
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Fix Quarterly Subscriptions (3 months -> 90 days)
UPDATE creator_subscriptions
SET current_period_end = current_period_start + INTERVAL '90 days'
FROM plan_pricing
WHERE creator_subscriptions.pricing_id = plan_pricing.id
  AND plan_pricing.billing_cycle = 'quarterly'
  AND creator_subscriptions.status IN ('active', 'pending');

-- 2. Fix Semi-Annual Subscriptions (6 months -> 180 days)
UPDATE creator_subscriptions
SET current_period_end = current_period_start + INTERVAL '180 days'
FROM plan_pricing
WHERE creator_subscriptions.pricing_id = plan_pricing.id
  AND plan_pricing.billing_cycle = 'semi_annual'
  AND creator_subscriptions.status IN ('active', 'pending');

-- 3. Fix Annual Subscriptions (12 months -> 365 days)
UPDATE creator_subscriptions
SET current_period_end = current_period_start + INTERVAL '365 days'
FROM plan_pricing
WHERE creator_subscriptions.pricing_id = plan_pricing.id
  AND plan_pricing.billing_cycle = 'annual'
  AND creator_subscriptions.status IN ('active', 'pending');

-- 4. Fix Monthly Subscriptions (1 month -> exactly 30 days)
-- (This ensures consistency, removing the JS setMonth side-effects)
UPDATE creator_subscriptions
SET current_period_end = current_period_start + INTERVAL '30 days'
FROM plan_pricing
WHERE creator_subscriptions.pricing_id = plan_pricing.id
  AND plan_pricing.billing_cycle = 'monthly'
  AND creator_subscriptions.status IN ('active', 'pending');

-- Verify the changes
SELECT cs.id, pp.billing_cycle, cs.current_period_start, cs.current_period_end 
FROM creator_subscriptions cs
JOIN plan_pricing pp ON cs.pricing_id = pp.id
LIMIT 20;
