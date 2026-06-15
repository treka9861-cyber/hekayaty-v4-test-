-- ============================================================
-- AUTHOR BOOK CLAIM SYSTEM
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Table 1: Claim Requests
CREATE TABLE IF NOT EXISTS book_claim_requests (
  id                  SERIAL PRIMARY KEY,
  book_id             INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL,            -- The claimer (author)
  publisher_id        TEXT NOT NULL,            -- The original uploader (writerId on product)
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_role      TEXT NOT NULL DEFAULT 'author'
                        CHECK (requested_role IN ('author', 'co_author', 'translator', 'editor', 'illustrator')),
  message             TEXT,                     -- Optional note from author to publisher
  rejection_reason    TEXT,                     -- Filled in by publisher on rejection
  reviewed_by         TEXT,                     -- publisher user_id who reviewed it
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Approved Book-Author Links
CREATE TABLE IF NOT EXISTS book_authors (
  id                      SERIAL PRIMARY KEY,
  book_id                 INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_user_id          TEXT NOT NULL,
  linked_by_publisher_id  TEXT NOT NULL,
  role                    TEXT NOT NULL DEFAULT 'author',
  linked_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, author_user_id)   -- Prevent duplicate links
);

-- ── Indexes ──────────────────────────────────────────────────

-- Prevent duplicate PENDING claims for same user + book
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_claim_pending_unique
  ON book_claim_requests(book_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_book_claim_book_id      ON book_claim_requests(book_id);
CREATE INDEX IF NOT EXISTS idx_book_claim_user_id      ON book_claim_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_book_claim_publisher_id ON book_claim_requests(publisher_id);
CREATE INDEX IF NOT EXISTS idx_book_claim_status       ON book_claim_requests(status);
CREATE INDEX IF NOT EXISTS idx_book_claim_created_at   ON book_claim_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_book_authors_author     ON book_authors(author_user_id);
CREATE INDEX IF NOT EXISTS idx_book_authors_book       ON book_authors(book_id);

-- ── Row-Level Security ────────────────────────────────────────

ALTER TABLE book_claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own claims or publisher claims" ON book_claim_requests;
CREATE POLICY "Users can view their own claims or publisher claims"
  ON book_claim_requests FOR SELECT
  USING (
    user_id = auth.uid()::TEXT
    OR publisher_id = auth.uid()::TEXT
  );

DROP POLICY IF EXISTS "Anyone can view book authors" ON book_authors;
CREATE POLICY "Anyone can view book authors"
  ON book_authors FOR SELECT
  USING (true);

-- ── Verify ───────────────────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('book_claim_requests', 'book_authors');
