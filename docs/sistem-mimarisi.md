# Borsa Takip - Sistem Mimarisi

## Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KULLANICI                                     │
│              (Tarayıcı / PWA / Telefon)                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NATRO (DNS)                                      │
│                                                                      │
│  finanswebte.com → 45.143.11.9                                      │
│  www.finanswebte.com → 45.143.11.9                                  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              KEYUBU VDS (45.143.11.9)                                │
│              Ubuntu · Docker · Nginx + Let's Encrypt SSL             │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy)                                       │    │
│  │  - HTTPS terminasyonu (Let's Encrypt)                        │    │
│  │  - www.finanswebte.com → localhost:3000                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Docker Compose                                              │    │
│  │                                                              │    │
│  │  ├── borsa-takip-app (Node.js + Express, port 8080)         │    │
│  │  │   - Static Files (React Native Web / PWA)                 │    │
│  │  │   - /api/auth/* → JWT Auth + Google OAuth                 │    │
│  │  │   - /api/portfolio/* → Portföy CRUD                       │    │
│  │  │   - /api/watchlist/* → Takip listesi CRUD                 │    │
│  │  │   - /api/stocks → TradingView API proxy                  │    │
│  │  │   - /api/history → Yahoo Finance proxy                    │    │
│  │  │   - /api/ai-analysis → Groq AI proxy                     │    │
│  │  │                                                           │    │
│  │  └── borsa-takip-db (PostgreSQL 16)                         │    │
│  │      - users, profiles, portfolio, transactions              │    │
│  │      - watchlist_groups, watchlist_items                      │    │
│  │      - Volume: pgdata (kalıcı veri)                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     HARİCİ API'LER                                   │
│                                                                      │
│  TradingView Scanner API → 560+ BIST hisse fiyatı (gerçek zamanlı) │
│  Yahoo Finance API → Geçmiş fiyat verileri (1G/3A/6A/1Y)           │
│  Groq AI (Llama 3.1 8b) → Yapay zeka teknik analiz                 │
│  Google OAuth 2.0 → Google ile giriş                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Bileşenler

| Bileşen | Görevi | Maliyet |
|---------|--------|---------|
| **Natro** | Domain DNS yönetimi | ~₺100/yıl |
| **Keyubu VDS** | Uygulama sunucusu (Docker + Nginx + SSL) | ₺135/ay |
| **PostgreSQL 16** | Veritabanı (Docker container, kalıcı volume) | Dahil |
| **TradingView** | Anlık hisse fiyatları | Ücretsiz |
| **Yahoo Finance** | Geçmiş fiyat verileri | Ücretsiz |
| **Groq AI** | Yapay zeka hisse analizi | Ücretsiz |
| **GitHub** | Kaynak kod + CI/CD + Docker image | Ücretsiz |
| **Google Cloud** | OAuth 2.0 (Google ile giriş) | Ücretsiz |

## Kimlik Doğrulama (Auth)

Kendi JWT tabanlı auth sistemi:
- Email/şifre ile kayıt ve giriş
- Google OAuth 2.0 ile giriş
- JWT token (7 gün geçerli)
- Şifreler bcrypt ile hash'lenir
- Her API isteğinde token doğrulanır

```
Kullanıcı → Login/Register → JWT Token alır → Her istekte Authorization header gönderir
```

## Veritabanı Şeması

```sql
users            → id, email, password_hash, full_name, google_id
profiles         → user_id, balance, total_deposit, total_withdraw, interest_rate
portfolio        → user_id, symbol, name, quantity, buy_price, buy_date
transactions     → user_id, type, symbol, quantity, price, total_amount, realized_pnl, date
watchlist_groups → user_id, name, is_default
watchlist_items  → group_id, user_id, symbol
```

## Deploy Akışı

```
Kod değişikliği
    → git push origin main
        → GitHub Actions: Docker image build → ghcr.io/ersinkaya/kiro-borsa-takip:latest
    → Sunucuda:
        docker pull ghcr.io/ersinkaya/kiro-borsa-takip:latest
        docker compose down && docker compose up -d
```

⚠️ `docker compose down` yaparken `-v` flag'i KULLANMA — volume'lar (DB verileri) silinir.

## Aylık Maliyet

| Kalem | Tutar |
|-------|-------|
| Keyubu VDS | ₺135/ay |
| Domain (Natro) | ~₺8/ay |
| Groq AI | ₺0 |
| TradingView/Yahoo | ₺0 |
| GitHub | ₺0 |
| **TOPLAM** | **~₺143/ay** |

## URL'ler

| Servis | URL |
|--------|-----|
| Canlı Uygulama | https://www.finanswebte.com |
| GitHub Repo | https://github.com/ersinkaya/kiro-borsa-takip |
| Docker Image | ghcr.io/ersinkaya/kiro-borsa-takip:latest |
| Google Cloud Console | https://console.cloud.google.com |
| Natro Panel | https://natro.com |
| Keyubu Panel | https://musteri.keyubu.com |

## Sunucu Bilgileri

| Bilgi | Değer |
|-------|-------|
| IP | 45.143.11.9 |
| Sağlayıcı | Keyubu VDS (İstanbul) |
| OS | Ubuntu |
| Uygulama Yolu | /opt/borsa-takip |
| Nginx Config | /etc/nginx/sites-available/finanswebte.com |
| SSL | Let's Encrypt (certbot, otomatik yenileme) |
