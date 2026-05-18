-- Borsa Takip - Kendi PostgreSQL Şeması
-- Bu SQL'i sunucudaki PostgreSQL'de çalıştırın

-- Kullanıcılar
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  google_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiller (bakiye bilgileri)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance NUMERIC(15, 2) DEFAULT 0,
  total_deposit NUMERIC(15, 2) DEFAULT 0,
  total_withdraw NUMERIC(15, 2) DEFAULT 0,
  interest_rate NUMERIC(5, 2) DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portföy
CREATE TABLE IF NOT EXISTS portfolio (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  buy_price NUMERIC(15, 4) NOT NULL,
  buy_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio(user_id);

-- İşlemler
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW')),
  symbol VARCHAR(20),
  name VARCHAR(255),
  quantity INTEGER,
  price NUMERIC(15, 4),
  total_amount NUMERIC(15, 2) NOT NULL,
  realized_pnl NUMERIC(15, 2),
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- Takip Listeleri
CREATE TABLE IF NOT EXISTS watchlist_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_groups_user ON watchlist_groups(user_id);

-- Takip Edilen Hisseler
CREATE TABLE IF NOT EXISTS watchlist_items (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES watchlist_groups(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, symbol)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_items_group ON watchlist_items(group_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user ON watchlist_items(user_id);
