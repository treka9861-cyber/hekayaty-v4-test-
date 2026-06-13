-- Phase 4: Marketing, Community & Settings

-- 1. Platform Settings
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Global Notifications
CREATE TABLE IF NOT EXISTS global_notifications (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_role TEXT NOT NULL DEFAULT 'all',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Global Chat Messages
CREATE TABLE IF NOT EXISTS global_chat_messages (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  is_flagged BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Platform Settings: Everyone can read, only service role can write
DROP POLICY IF EXISTS "Public can read settings" ON platform_settings;
CREATE POLICY "Public can read settings" ON platform_settings
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Service role has full access to settings" ON platform_settings;
CREATE POLICY "Service role has full access to settings" ON platform_settings
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Global Notifications: Everyone can read, only service role can write
DROP POLICY IF EXISTS "Public can read notifications" ON global_notifications;
CREATE POLICY "Public can read notifications" ON global_notifications
  FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Service role has full access to notifications" ON global_notifications;
CREATE POLICY "Service role has full access to notifications" ON global_notifications
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Global Chat Messages: Authenticated can read and insert their own
DROP POLICY IF EXISTS "Authenticated users can read chat" ON global_chat_messages;
CREATE POLICY "Authenticated users can read chat" ON global_chat_messages
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own chat messages" ON global_chat_messages;
CREATE POLICY "Users can insert their own chat messages" ON global_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Service role has full access to chat" ON global_chat_messages;
CREATE POLICY "Service role has full access to chat" ON global_chat_messages
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
