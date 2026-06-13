-- ============================================================
-- VERIFICATION SYSTEM: Add missing columns to users table
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add verification columns (safe: IF NOT EXISTS equivalent using DO block)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add missing admin columns while we're here (safe to run even if they exist)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Verify columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'is_verified', 'verified_at', 'verified_by',
    'verification_notes', 'status', 'ban_reason', 'admin_notes'
  )
ORDER BY column_name;
