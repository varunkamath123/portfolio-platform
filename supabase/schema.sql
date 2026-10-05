-- Portfolio Q&A Platform — Supabase schema
-- Run this in Supabase SQL editor after creating your project

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── user_profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id    TEXT UNIQUE NOT NULL,
  email            TEXT NOT NULL DEFAULT '',
  full_name        TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  is_admin         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── kite_credentials ──────────────────────────────────────────────────────────
-- The platform's Kite Connect app key + secret live in env vars (KITE_API_KEY,
-- KITE_API_SECRET). This table only stores the per-user OAuth access token.
CREATE TABLE IF NOT EXISTS kite_credentials (
  id                UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id           UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  access_token_enc  TEXT,                 -- AES-256 encrypted, refreshed daily
  token_date        TIMESTAMPTZ,          -- when token was last generated
  is_connected      BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── questions ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  tickers     TEXT[] DEFAULT '{}',
  status      TEXT DEFAULT 'processing',  -- 'processing' | 'answered' | 'failed'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── answers ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS answers (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  question_id   UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_md     TEXT NOT NULL,
  mirofish_data JSONB,                    -- full MiroFish result array
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kite_creds_user   ON kite_credentials (user_id);
CREATE INDEX IF NOT EXISTS idx_questions_user    ON questions (user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status  ON questions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_question  ON answers (question_id);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kite_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers          ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by API routes with SUPABASE_SERVICE_ROLE_KEY)

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_kite_creds_updated_at
  BEFORE UPDATE ON kite_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
