CREATE TABLE IF NOT EXISTS "account_leaderboard_cache" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "rank" integer NOT NULL,
  "followers_count" integer DEFAULT 0 NOT NULL,
  "books_count" integer DEFAULT 0 NOT NULL,
  "views_count" integer DEFAULT 0 NOT NULL,
  "account_created_at" timestamp,
  "calculated_at" timestamp DEFAULT now(),
  "is_hidden" boolean DEFAULT false
);

CREATE INDEX IF NOT EXISTS "idx_account_leaderboard_rank" ON "account_leaderboard_cache" ("rank");
CREATE INDEX IF NOT EXISTS "idx_account_leaderboard_user" ON "account_leaderboard_cache" ("user_id");
