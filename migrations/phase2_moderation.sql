-- Phase 2: Content & Creator Moderation Tables
-- Run this in the Supabase SQL Editor

-- 1. Content Reports Table
CREATE TABLE IF NOT EXISTS content_reports (
  id SERIAL PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('user', 'product', 'review', 'comment')),
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by TEXT
);

-- 2. Product Moderation Table
CREATE TABLE IF NOT EXISTS product_moderation (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  moderated_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON content_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_content_reports_target ON content_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_product_moderation_product ON product_moderation(product_id);
CREATE INDEX IF NOT EXISTS idx_product_moderation_status ON product_moderation(status);

-- 4. RLS Policies (only admins can read all reports; users can insert their own)
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_moderation ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to create reports
DROP POLICY IF EXISTS "Users can create reports" ON content_reports;
CREATE POLICY "Users can create reports" ON content_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = reporter_id);

-- Allow service role full access (used by server-side admin routes)
DROP POLICY IF EXISTS "Service role has full access to reports" ON content_reports;
CREATE POLICY "Service role has full access to reports" ON content_reports
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to moderation" ON product_moderation;
CREATE POLICY "Service role has full access to moderation" ON product_moderation
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
