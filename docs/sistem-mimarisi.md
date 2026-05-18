# Borsa Takip - Sistem Mimarisi

## Genel Bakış

```
┌─────────────────────────────────────────────────────────────────────┐
│                        KULLANICI                                     │
│                    (Tarayıcı/Telefon)                                │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NATRO (DNS)                                      │
│                                                                      │
│  finanswebte.com → 45.143.11.9 (Keyubu VDS)                        │
│  www.finanswebte.com → 45.143.11.9 (Keyubu VDS)                    │
│                                                                      │
│  Görevi: Alan adını sunucuya yönlendirmek                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│              KEYUBU VDS (45.143.11.9)                                │
│              Ubuntu · Docker · Nginx + SSL                           │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy + Let's Encrypt SSL)                   │    │
│  │  - HTTPS terminasyonu                                        │    │
│  │  - finanswebte.com → localhost:3000                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Docker Compose                                              │    │
│  │                                                              │    │
│  │  ├── borsa-takip-app (Node.js + Express)                    │    │
│  │  │   - Static Files (React Native Web App)                   │    │
│  │  │   - /api/stocks → TradingView API proxy                  │    │
│  │  │   - /api/history → Yahoo Finance proxy                    │    │
│  │  │   - /api/ai-analysis → Groq AI proxy                     │    │
│  │  │                                                           │    │
│  │  └── borsa-takip-db (PostgreSQL 16)                         │    │
│  │      - Kullanıcı verileri (ileride)                          │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Görevi: Uygulamayı 7/24 çalıştırmak                               │
└──────────────┬────────────────────────────┬─────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────┐  ┌────────────────────────────────────────┐
│   SUPABASE (Auth)        │  │   Harici API'ler                        │
│                          │  │                                        │
│  Auth (Kimlik Doğrulama):│  │  TradingView Scanner API               │
│  - Email/şifre kayıt     │  │  - 630+ BIST hisse fiyatı              │
│  - Google OAuth login    │  │  - Gerçek zamanlı veri                  │
│  - Session yönetimi      │  │                                        │
│                          │  │  Yahoo Finance API                      │
│  PostgreSQL DB:          │  │  - Geçmiş fiyat verileri                │
│  - profiles (bakiye)     │  │                                        │
│  - portfolio (hisseler)  │  │  Groq AI (Llama modeli)                 │
│  - transactions (işlem)  │  │  - Yapay zeka hisse analizi             │
│  - watchlist_groups      │  │                                        │
│  - watchlist_items       │  │  Görevi: Veri sağlamak                  │
│                          │  └────────────────────────────────────────┘
│  Row Level Security:     │
│  - Her kullanıcı sadece  │
│    kendi verisini görür   │
│                          │
│  Görevi: Veri saklama +  │
│  kullanıcı yönetimi      │
└──────────────────────────┘
```

## Her Bileşenin Görevi

| Bileşen | Nerede | Ne Yapıyor | Maliyet |
|---------|--------|------------|---------|
| **Natro** | DNS sağlayıcı | Domain → Sunucu yönlendirmesi | ~100₺/yıl |
| **Keyubu VDS** | İstanbul, Türkiye | Uygulamayı çalıştırır (Docker + Nginx + SSL) | ₺135/ay |
| **Supabase** | Bulut | Veritabanı + kullanıcı girişi (Auth) | Ücretsiz |
| **TradingView** | Kendi sunucuları | Hisse fiyatları (gerçek zamanlı) | Ücretsiz |
| **Yahoo Finance** | Kendi sunucuları | Geçmiş fiyat verileri | Ücretsiz |
| **Groq AI** | Kendi sunucuları | Yapay zeka hisse analizi | Ücretsiz |
| **GitHub** | Microsoft sunucuları | Kaynak kod + Docker image | Ücretsiz |
| **Google Cloud** | Google sunucuları | Google ile giriş (OAuth) | Ücretsiz |

## Veri Akışı

### Kullanıcı giriş yapar:
```
Tarayıcı → Supabase Auth → Google OAuth (opsiyonel) → Session oluşur
```

### Hisse fiyatları yüklenir:
```
Tarayıcı → Keyubu VDS /api/stocks → TradingView API → Fiyatlar döner
```

### AI Analiz istenir:
```
Tarayıcı → Keyubu VDS /api/ai-analysis → Groq AI → Analiz döner (1 saat cache)
```

### Sayfa açılır:
```
Tarayıcı → Nginx (SSL) → Docker App (dist/index.html) → React Native Web render
```

## Deploy Akışı

```
Sen kod değiştirirsin
    → git push origin main
        → GitHub Actions: Docker image build → ghcr.io'ya push
    → Sunucuda: docker compose pull && docker compose up -d
        → Yeni image indirilir, container yeniden başlar
```

## Teknoloji Yığını

### Frontend (Kullanıcı Arayüzü)
- **React Native** (Expo SDK 52) - Mobil ve web uyumlu
- **TypeScript** - Tip güvenliği
- **Zustand** - State management
- **React Navigation** - Sayfa geçişleri
- **TradingView Widget** - Profesyonel grafik (RSI, Fibonacci, mum grafik)

### Backend (Sunucu Tarafı)
- **Node.js + Express** - API server + proxy
- **Docker** - Container'ize deployment
- **PostgreSQL 16** - Veritabanı (sunucuda)
- **Supabase** - Auth + DB (bulut)
- **Groq AI** - Yapay zeka analiz

### Altyapı
- **Keyubu VDS** - İstanbul datacenter, 4 CPU, 4GB RAM
- **Nginx** - Reverse proxy + SSL terminasyonu
- **Let's Encrypt** - Ücretsiz HTTPS sertifikası (otomatik yenileme)
- **Docker Compose** - Multi-container orchestration
- **GitHub Actions** - CI/CD (otomatik Docker image build)

## Veritabanı Şeması

```sql
profiles        → Kullanıcı bilgileri, bakiye, faiz oranı
portfolio       → Sahip olunan hisseler (sembol, adet, alış fiyatı, tarih)
transactions    → Tüm işlem geçmişi (alış, satış, yatırma, çekme)
watchlist_groups → Takip listeleri (birden fazla liste)
watchlist_items  → Takip edilen hisseler
```

## Güvenlik

- **HTTPS**: Tüm trafik şifreli (Let's Encrypt sertifikası)
- **Row Level Security (RLS)**: Her kullanıcı sadece kendi verisini okur/yazar
- **Anon Key**: Public, sadece RLS kuralları dahilinde erişim sağlar
- **OAuth 2.0**: Google login güvenli token exchange ile çalışır
- **DDoS Koruması**: Keyubu altyapısında dahili koruma

## Sunucu Bilgileri

| Bilgi | Değer |
|-------|-------|
| IP | 45.143.11.9 |
| Sağlayıcı | Keyubu (İstanbul) |
| OS | Ubuntu |
| Uygulama Yolu | /opt/borsa-takip |
| Nginx Config | /etc/nginx/sites-available/finanswebte.com |
| SSL Sertifikası | Let's Encrypt (otomatik yenileme) |

## URL'ler

| Servis | URL |
|--------|-----|
| Canlı Uygulama | https://www.finanswebte.com |
| Supabase Dashboard | https://supabase.com/dashboard/project/qffqyeuwqmqrtemxxpdx |
| GitHub Repo | https://github.com/ersinkaya/kiro-borsa-takip |
| Docker Image | ghcr.io/ersinkaya/kiro-borsa-takip:latest |
| Google Cloud Console | https://console.cloud.google.com |
| Natro Panel | https://natro.com (domain: finanswebte.com) |
| Keyubu Panel | https://musteri.keyubu.com |

## Aylık Maliyet

| Kalem | Tutar |
|-------|-------|
| Keyubu VDS | ₺135/ay |
| Supabase | ₺0 (ücretsiz tier) |
| Groq AI | ₺0 (ücretsiz tier) |
| Domain (Natro) | ~₺8/ay (yıllık ₺100) |
| **TOPLAM** | **~₺143/ay** |
