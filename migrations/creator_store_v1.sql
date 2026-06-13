-- ============================================================
-- HEKAYATY CREATOR STORE SYSTEM — MIGRATION v1
-- Safe, additive migration. No existing tables are modified
-- except `subscribers` which gets a nullable `tier_id` column.
-- ============================================================

-- 1. UNIVERSES
CREATE TABLE IF NOT EXISTS universes (
  id SERIAL PRIMARY KEY,
  creator_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. UNIVERSE CHARACTERS
CREATE TABLE IF NOT EXISTS universe_characters (
  id SERIAL PRIMARY KEY,
  universe_id INTEGER NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  traits JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. UNIVERSE LOCATIONS
CREATE TABLE IF NOT EXISTS universe_locations (
  id SERIAL PRIMARY KEY,
  universe_id INTEGER NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  map_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. UNIVERSE FACTIONS
CREATE TABLE IF NOT EXISTS universe_factions (
  id SERIAL PRIMARY KEY,
  universe_id INTEGER NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. UNIVERSE TIMELINE EVENTS
CREATE TABLE IF NOT EXISTS universe_timeline_events (
  id SERIAL PRIMARY KEY,
  universe_id INTEGER NOT NULL REFERENCES universes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. COMMUNITY POSTS
CREATE TABLE IF NOT EXISTS community_posts (
  id SERIAL PRIMARY KEY,
  creator_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text',
  title TEXT,
  content TEXT NOT NULL,
  media_url TEXT,
  is_exclusive BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  poll_options JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. COMMUNITY COMMENTS
CREATE TABLE IF NOT EXISTS community_comments (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COMMUNITY LIKES
CREATE TABLE IF NOT EXISTS community_likes (
  id SERIAL PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- 9. MEMBERSHIP TIERS
CREATE TABLE IF NOT EXISTS membership_tiers (
  id SERIAL PRIMARY KEY,
  writer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  benefits JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. EXTEND SUBSCRIBERS (safe — only runs if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'subscribers'
  ) THEN
    ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS tier_id INTEGER REFERENCES membership_tiers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 11. STORE ANALYTICS
CREATE TABLE IF NOT EXISTS store_analytics (
  id SERIAL PRIMARY KEY,
  store_id TEXT NOT NULL,
  visitor_id TEXT,
  event_type TEXT NOT NULL,
  target_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_universes_creator ON universes(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_creator ON community_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_pinned ON community_posts(is_pinned);
CREATE INDEX IF NOT EXISTS idx_membership_tiers_writer ON membership_tiers(writer_id);
CREATE INDEX IF NOT EXISTS idx_store_analytics_store ON store_analytics(store_id);
CREATE INDEX IF NOT EXISTS idx_store_analytics_event ON store_analytics(event_type);

-- ============================================================
-- RLS POLICIES (Row-Level Security)
-- ============================================================

-- Universes: public read, creator-only write
ALTER TABLE universes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public universes are readable" ON universes FOR SELECT USING (is_public = TRUE);
CREATE POLICY "Creators manage their universes" ON universes FOR ALL USING (auth.uid()::text = creator_id);

-- Community posts: public read, creator-only write  
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public posts are readable" ON community_posts FOR SELECT USING (is_exclusive = FALSE);
CREATE POLICY "Creators manage their posts" ON community_posts FOR ALL USING (auth.uid()::text = creator_id);

-- Store analytics: insert-only for any user
ALTER TABLE store_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can track analytics" ON store_analytics FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Creators read their analytics" ON store_analytics FOR SELECT USING (auth.uid()::text = store_id);

-- Membership tiers: public read, creator-only write
ALTER TABLE membership_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tiers are publicly readable" ON membership_tiers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Creators manage tiers" ON membership_tiers FOR ALL USING (auth.uid()::text = writer_id);
