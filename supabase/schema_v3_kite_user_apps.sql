-- v3: per-user Kite Connect apps.
-- A Kite Connect app only accepts logins from the Zerodha account that owns it
-- ("user is not enabled for this app"), so each user stores their own app's
-- api_key + api_secret (AES-256 encrypted). The admin may leave these NULL and
-- fall back to the platform app in KITE_API_KEY / KITE_API_SECRET.
ALTER TABLE kite_credentials ADD COLUMN IF NOT EXISTS api_key_enc    TEXT;
ALTER TABLE kite_credentials ADD COLUMN IF NOT EXISTS api_secret_enc TEXT;
