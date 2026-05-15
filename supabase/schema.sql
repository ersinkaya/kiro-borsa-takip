-- Borsa Takip - Veritabanı Şeması
-- Bu SQL'i Supabase SQL Editor'de çalıştırın

-- ============================================
-- 1. PROFILES TABLOSU (Kullanıcı bilgileri)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  balance NUMERIC(15, 2) DEFAULT 0,
  total_deposit NUMERIC(15, 2) DEFAULT 0,
  total_withdraw NUMERIC(15, 2) DEFAULT 0,
  interest_rate NUMERIC(5, 2) DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. PORTFOLIO TABLOSU (Sahip olunan hisseler)
-- ============================================
CREATE TABLE IF NOT EXISTS portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  buy_price NUMERIC(15, 4) NOT NULL,
  buy_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portfolio_user_id_idx ON portfolio(user_id);
CREATE INDEX IF NOT EXISTS portfolio_symbol_idx ON portfolio(symbol);

-- ============================================
-- 3. TRANSACTIONS TABLOSU (Alım/Satım geçmişi)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAW')),
  symbol TEXT,
  name TEXT,
  quantity INTEGER,
  price NUMERIC(15, 4),
  total_amount NUMERIC(15, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date DESC);

-- ============================================
-- 4. WATCHLIST_GROUPS TABLOSU (Takip listeleri)
-- ============================================
CREATE TABLE IF NOT EXISTS watchlist_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS watchlist_groups_user_id_idx ON watchlist_groups(user_id);

-- ============================================
-- 5. WATCHLIST_ITEMS TABLOSU (Takip edilen hisseler)
-- ============================================
CREATE TABLE IF NOT EXISTS watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES watchlist_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, symbol)
);

CREATE INDEX IF NOT EXISTS watchlist_items_group_id_idx ON watchlist_items(group_id);
CREATE INDEX IF NOT EXISTS watchlist_items_user_id_idx ON watchlist_items(user_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) - Her kullanıcı sadece kendi verisini görür
-- ============================================

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanicilar kendi profilini gorebilir"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Kullanicilar kendi profilini guncelleyebilir"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Kullanicilar kendi profilini olusturabilir"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Portfolio
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanicilar kendi portfoyunu gorebilir"
  ON portfolio FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Kullanicilar kendi portfoyune ekleyebilir"
  ON portfolio FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanicilar kendi portfoyunu silebilir"
  ON portfolio FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Kullanicilar kendi portfoyunu guncelleyebilir"
  ON portfolio FOR UPDATE USING (auth.uid() = user_id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanicilar kendi islemlerini gorebilir"
  ON transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Kullanicilar islem ekleyebilir"
  ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Watchlist Groups
ALTER TABLE watchlist_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanicilar kendi listelerini gorebilir"
  ON watchlist_groups FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Kullanicilar liste olusturabilir"
  ON watchlist_groups FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanicilar kendi listelerini silebilir"
  ON watchlist_groups FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Kullanicilar kendi listelerini guncelleyebilir"
  ON watchlist_groups FOR UPDATE USING (auth.uid() = user_id);

-- Watchlist Items
ALTER TABLE watchlist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Kullanicilar kendi takip hisselerini gorebilir"
  ON watchlist_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Kullanicilar takip hissesi ekleyebilir"
  ON watchlist_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kullanicilar takip hissesi silebilir"
  ON watchlist_items FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER: Yeni kullanıcı kayıt olduğunda otomatik profil oluştur
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profil oluştur
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );

  -- Varsayılan takip listesi oluştur
  INSERT INTO public.watchlist_groups (user_id, name, is_default)
  VALUES (NEW.id, 'Takip Listem', TRUE);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
