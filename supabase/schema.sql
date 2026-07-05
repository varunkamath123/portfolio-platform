-- FnO Dashboard — Supabase schema
-- Run this in Supabase SQL editor after creating your project

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── user_profiles ─────────────────────────────────────────────────────────────
-- One row per Clerk user. Created on first sign-in via /api/users/sync.
CREATE TABLE IF NOT EXISTS user_profiles (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  clerk_user_id    TEXT UNIQUE NOT NULL,
  email            TEXT NOT NULL,
  full_name        TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  is_admin         BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── fyers_credentials ─────────────────────────────────────────────────────────
-- Fyers API key + secret stored AES-256 encrypted. One row per user.
CREATE TABLE IF NOT EXISTS fyers_credentials (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  client_id        TEXT NOT NULL,        -- e.g. "XY12345-100"
  api_key_enc      TEXT NOT NULL,        -- AES-256 encrypted
  secret_key_enc   TEXT NOT NULL,        -- AES-256 encrypted
  access_token_enc TEXT,                 -- AES-256 encrypted, refreshed daily
  token_expiry     TIMESTAMPTZ,          -- token expires at midnight IST
  is_connected     BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ── trade_cache ───────────────────────────────────────────────────────────────
-- Historical trade records synced from Fyers tradebook.
-- Fyers only exposes today's trades live; we persist them here as they happen.
CREATE TABLE IF NOT EXISTS trade_cache (
  id               UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id          UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  order_id         TEXT NOT NULL,
  trade_date       DATE NOT NULL,
  symbol           TEXT NOT NULL,
  instrument_type  TEXT,                 -- 'OPTIONS', 'FUTURES', 'EQUITY'
  side             TEXT NOT NULL,        -- 'BUY' or 'SELL'
  quantity         INTEGER NOT NULL,
  price            DECIMAL(12,2) NOT NULL,
  trade_value      DECIMAL(14,2),        -- price * quantity
  pnl              DECIMAL(12,2),        -- realized P&L for this trade
  charges          DECIMAL(10,2),        -- brokerage + STT + charges
  pnl_after_tax    DECIMAL(12,2),        -- after estimated tax
  raw_data         JSONB,                -- full Fyers response
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trade_cache_user_date
  ON trade_cache (user_id, trade_date DESC);

CREATE INDEX IF NOT EXISTS idx_fyers_creds_user
  ON fyers_credentials (user_id);

-- ── Row-level security ────────────────────────────────────────────────────────
ALTER TABLE user_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE fyers_credentials  ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_cache        ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (used by API routes with service key)
-- Anon + authenticated roles have no access — all reads go through API routes

-- ── Updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_fyers_creds_updated_at
  BEFORE UPDATE ON fyers_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
