
-- Crypto Analysis PostgreSQL schema
-- Run this after connecting Navicat to database "crypto_analysis".
-- If the database does not exist yet, run database/00_create_database.sql first.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('open', 'triggered', 'disabled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE tx_direction AS ENUM ('incoming', 'outgoing', 'unknown');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Core account management
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(180) NOT NULL UNIQUE,
  username VARCHAR(80) UNIQUE,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(160),
  role VARCHAR(40) NOT NULL DEFAULT 'user',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  telegram_chat_id VARCHAR(80),
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_users_status ON users(status);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_token_id UUID,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS ix_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

CREATE TABLE IF NOT EXISTS security_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(80) NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS ix_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS ix_security_logs_created_at ON security_logs(created_at);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  ip_address VARCHAR(64),
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS ix_user_sessions_expires_at ON user_sessions(expires_at);

CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(60) NOT NULL,
  key_name VARCHAR(120) NOT NULL,
  encrypted_value TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_provider_key_name UNIQUE(user_id, provider, key_name)
);

CREATE INDEX IF NOT EXISTS ix_user_api_keys_user_id ON user_api_keys(user_id);
CREATE INDEX IF NOT EXISTS ix_user_api_keys_provider ON user_api_keys(provider);

DROP TRIGGER IF EXISTS trg_user_api_keys_updated_at ON user_api_keys;
CREATE TRIGGER trg_user_api_keys_updated_at
BEFORE UPDATE ON user_api_keys
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Market data
CREATE TABLE IF NOT EXISTS coins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol VARCHAR(24) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  coingecko_id VARCHAR(120),
  binance_symbol VARCHAR(40),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_coins_is_active ON coins(is_active);

DROP TRIGGER IF EXISTS trg_coins_updated_at ON coins;
CREATE TRIGGER trg_coins_updated_at
BEFORE UPDATE ON coins
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS price_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  coin_id UUID REFERENCES coins(id) ON DELETE SET NULL,
  symbol VARCHAR(24) NOT NULL,
  price_usd NUMERIC(28, 10) NOT NULL,
  change_24h_percent NUMERIC(12, 4),
  volume_24h_usd NUMERIC(28, 2),
  market_cap_usd NUMERIC(28, 2),
  source VARCHAR(60) NOT NULL DEFAULT 'binance',
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_price_snapshots_symbol_time ON price_snapshots(symbol, captured_at DESC);
CREATE INDEX IF NOT EXISTS ix_price_snapshots_coin_id ON price_snapshots(coin_id);

-- User watchlists and price alerts
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL DEFAULT 'Default',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_watchlists_user_id ON watchlists(user_id);

DROP TRIGGER IF EXISTS trg_watchlists_updated_at ON watchlists;
CREATE TRIGGER trg_watchlists_updated_at
BEFORE UPDATE ON watchlists
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  coin_id UUID REFERENCES coins(id) ON DELETE SET NULL,
  symbol VARCHAR(24) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_watchlist_symbol UNIQUE(watchlist_id, symbol)
);

CREATE INDEX IF NOT EXISTS ix_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);

CREATE TABLE IF NOT EXISTS price_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(24) NOT NULL,
  operator VARCHAR(8) NOT NULL CHECK (operator IN ('>', '<', '>=', '<=')),
  target_price_usd NUMERIC(28, 10) NOT NULL,
  status alert_status NOT NULL DEFAULT 'open',
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS ix_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS ix_price_alerts_status ON price_alerts(status);

DROP TRIGGER IF EXISTS trg_price_alerts_updated_at ON price_alerts;
CREATE TRIGGER trg_price_alerts_updated_at
BEFORE UPDATE ON price_alerts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Portfolio tracker
CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL DEFAULT 'Main portfolio',
  base_currency VARCHAR(12) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_portfolios_user_id ON portfolios(user_id);

DROP TRIGGER IF EXISTS trg_portfolios_updated_at ON portfolios;
CREATE TRIGGER trg_portfolios_updated_at
BEFORE UPDATE ON portfolios
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol VARCHAR(24) NOT NULL,
  amount NUMERIC(36, 18) NOT NULL,
  average_buy_price_usd NUMERIC(28, 10) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_portfolio_symbol UNIQUE(portfolio_id, symbol)
);

CREATE INDEX IF NOT EXISTS ix_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);

DROP TRIGGER IF EXISTS trg_portfolio_holdings_updated_at ON portfolio_holdings;
CREATE TRIGGER trg_portfolio_holdings_updated_at
BEFORE UPDATE ON portfolio_holdings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Wallet scanner
CREATE TABLE IF NOT EXISTS scanned_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  address VARCHAR(128) NOT NULL,
  chain VARCHAR(32) NOT NULL,
  label VARCHAR(120),
  last_scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_scanned_wallet_address_chain UNIQUE(address, chain)
);

CREATE INDEX IF NOT EXISTS ix_scanned_wallets_user_id ON scanned_wallets(user_id);
CREATE INDEX IF NOT EXISTS ix_scanned_wallets_address ON scanned_wallets(address);

DROP TRIGGER IF EXISTS trg_scanned_wallets_updated_at ON scanned_wallets;
CREATE TRIGGER trg_scanned_wallets_updated_at
BEFORE UPDATE ON scanned_wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS scanned_wallet_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scanned_wallet_id UUID NOT NULL REFERENCES scanned_wallets(id) ON DELETE CASCADE,
  symbol VARCHAR(32) NOT NULL,
  token_address VARCHAR(128),
  amount NUMERIC(36, 18) NOT NULL DEFAULT 0,
  price_usd NUMERIC(28, 10),
  value_usd NUMERIC(28, 2),
  source VARCHAR(80),
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_scanned_wallet_assets_wallet_id ON scanned_wallet_assets(scanned_wallet_id);

-- Whale Alert module
CREATE TABLE IF NOT EXISTS whale_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  address VARCHAR(128) NOT NULL,
  chain VARCHAR(32) NOT NULL,
  label VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_whale_wallet_address_chain UNIQUE(address, chain)
);

CREATE INDEX IF NOT EXISTS ix_whale_wallets_user_id ON whale_wallets(user_id);
CREATE INDEX IF NOT EXISTS ix_whale_wallets_address ON whale_wallets(address);
CREATE INDEX IF NOT EXISTS ix_whale_wallets_chain ON whale_wallets(chain);
CREATE INDEX IF NOT EXISTS ix_whale_wallets_is_active ON whale_wallets(is_active);

DROP TRIGGER IF EXISTS trg_whale_wallets_updated_at ON whale_wallets;
CREATE TRIGGER trg_whale_wallets_updated_at
BEFORE UPDATE ON whale_wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS whale_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tx_hash VARCHAR(128) NOT NULL UNIQUE,
  chain VARCHAR(32) NOT NULL,
  wallet_address VARCHAR(128) NOT NULL,
  whale_wallet_id UUID REFERENCES whale_wallets(id) ON DELETE SET NULL,
  token_symbol VARCHAR(32) NOT NULL,
  token_address VARCHAR(128),
  amount NUMERIC(36, 18) NOT NULL,
  usd_value NUMERIC(28, 2) NOT NULL,
  direction tx_direction NOT NULL DEFAULT 'unknown',
  raw_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_whale_transactions_hash ON whale_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS ix_whale_transactions_chain ON whale_transactions(chain);
CREATE INDEX IF NOT EXISTS ix_whale_transactions_wallet_address ON whale_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS ix_whale_transactions_wallet_id ON whale_transactions(whale_wallet_id);
CREATE INDEX IF NOT EXISTS ix_whale_transactions_usd_value ON whale_transactions(usd_value);
CREATE INDEX IF NOT EXISTS ix_whale_transactions_created_at ON whale_transactions(created_at);

CREATE TABLE IF NOT EXISTS whale_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  whale_transaction_id UUID NOT NULL REFERENCES whale_transactions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  wallet_address VARCHAR(128) NOT NULL,
  chain VARCHAR(32) NOT NULL,
  title VARCHAR(180) NOT NULL,
  message TEXT NOT NULL,
  usd_value NUMERIC(28, 2) NOT NULL,
  sent_telegram BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_whale_alerts_transaction_id ON whale_alerts(whale_transaction_id);
CREATE INDEX IF NOT EXISTS ix_whale_alerts_user_id ON whale_alerts(user_id);
CREATE INDEX IF NOT EXISTS ix_whale_alerts_wallet_address ON whale_alerts(wallet_address);
CREATE INDEX IF NOT EXISTS ix_whale_alerts_usd_value ON whale_alerts(usd_value);
CREATE INDEX IF NOT EXISTS ix_whale_alerts_created_at ON whale_alerts(created_at);

-- Global and user settings
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON app_settings;
CREATE TRIGGER trg_app_settings_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(100) NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_setting UNIQUE(user_id, key)
);

CREATE INDEX IF NOT EXISTS ix_user_settings_user_id ON user_settings(user_id);

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed data
INSERT INTO app_settings(key, value)
VALUES
  ('alert_threshold_usd', '100000'),
  ('default_refresh_seconds', '1'),
  ('default_quote_currency', 'USD')
ON CONFLICT (key) DO NOTHING;

INSERT INTO coins(symbol, name, coingecko_id, binance_symbol)
VALUES
  ('BTC', 'Bitcoin', 'bitcoin', 'BTCUSDT'),
  ('ETH', 'Ethereum', 'ethereum', 'ETHUSDT'),
  ('SOL', 'Solana', 'solana', 'SOLUSDT'),
  ('BNB', 'BNB', 'binancecoin', 'BNBUSDT'),
  ('XRP', 'XRP', 'ripple', 'XRPUSDT'),
  ('DOGE', 'Dogecoin', 'dogecoin', 'DOGEUSDT'),
  ('ADA', 'Cardano', 'cardano', 'ADAUSDT'),
  ('AVAX', 'Avalanche', 'avalanche-2', 'AVAXUSDT'),
  ('LINK', 'Chainlink', 'chainlink', 'LINKUSDT'),
  ('SUI', 'Sui', 'sui', 'SUIUSDT')
ON CONFLICT(symbol) DO NOTHING;

INSERT INTO whale_wallets(address, chain, label, is_active)
VALUES
  ('0x742d35cc6634c0532925a3b844bc454e4438f44e', 'ethereum', 'Binance cold wallet sample', true)
ON CONFLICT(address, chain) DO NOTHING;
