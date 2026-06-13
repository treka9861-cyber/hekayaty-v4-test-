-- Phase 3: Marketplace, Logistics & Financials

-- 1. Products Table Inventory Fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku TEXT;

-- 2. Order Items Returns Fields
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_status TEXT CHECK (return_status IN ('pending_approval', 'approved', 'rejected', 'refunded'));
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS return_reason TEXT;

-- 3. Platform Finances Table
CREATE TABLE IF NOT EXISTS platform_finances (
  id SERIAL PRIMARY KEY,
  period TEXT NOT NULL UNIQUE, -- 'YYYY-MM'
  total_revenue INTEGER NOT NULL DEFAULT 0,
  platform_fees INTEGER NOT NULL DEFAULT 0,
  creator_payouts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. RLS for Platform Finances
ALTER TABLE platform_finances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view platform finances" ON platform_finances;
CREATE POLICY "Admins can view platform finances" ON platform_finances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::uuid = auth.uid() AND users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Service role has full access to platform finances" ON platform_finances;
CREATE POLICY "Service role has full access to platform finances" ON platform_finances
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
