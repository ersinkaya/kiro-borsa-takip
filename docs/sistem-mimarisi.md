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
│  finanswebte.com → www.finanswebte.com (yönlendirme)                │
│  www.finanswebte.com → Railway sunucusu (CNAME)                     │
│                                                                      │
│  Görevi: Alan adını doğru sunucuya yönlendirmek                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   RAILWAY (Hosting)                                   │
│                   Port 8080 · Docker Container                       │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  docker-server.js (Express)                                  │    │
│  │                                                              │    │
│  │  1. Static Files → dist/ klasörü (React Native Web App)     │    │
│  │     - HTML, JS, CSS, fontlar                                 │    │
│  │     - Login ekranı, portföy, takip listesi vs.               │    │
│  │                                                              │    │
│  │  2. /api/stocks → TradingView API proxy                     │    │
│  │     - Hisse fiyatları (gerçek zamanlı)                       │    │
│  │                                                              │    │
│  │  3. /api/history/:symbol → Yahoo Finance proxy               │    │
│  │     - Son 1 aylık geçmiş veriler                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Görevi: Uygulamayı 7/24 çalıştırmak, fiyat verisi proxy'si        │
└──────────────┬────────────────────────────┬─────────────────────────┘
               │                            │
               ▼                            ▼
┌──────────────────────────┐  ┌────────────────────────────────────────┐
│   SUPABASE (Veritabanı)  │  │   TradingView & Yahoo Finance (API)    │
│                          │  │                                        │
│  PostgreSQL DB:          │  │  - 630+ BIST hisse fiyatı              │
│  - profiles (bakiye)     │  │  - Gerçek zamanlı veri                 │
│  - portfolio (hisseler)  │  │  - Son 1 aylık geçmiş                  │
│  - transactions (işlem)  │  │                                        │
│  - watchlist_groups      │  │  Görevi: Borsa verisi sağlamak         │
│  - watchlist_items       │  └────────────────────────────────────────┘
│                          │
│  Auth (Kimlik Doğrulama):│
│  - Email/şifre kayıt     │
│  - Google OAuth login    │
│  - Session yönetimi      │
│                          │
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
| **Natro** | DNS sağlayıcı | `finanswebte.com` → Railway yönlendirmesi | ~100₺/yıl (domain) |
| **Railway** | ABD/EU sunucu | Uygulamayı çalıştırır, HTTPS sertifikası | $5/ay (trial ücretsiz) |
| **Supabase** | AWS (Singapur/EU) | Veritabanı + kullanıcı girişi | Ücretsiz (500MB'a kadar) |
| **TradingView** | Kendi sunucuları | Hisse fiyatları | Ücretsiz (rate limit var) |
| **Yahoo Finance** | Kendi sunucuları | Geçmiş fiyat verileri | Ücretsiz |
| **GitHub** | Microsoft sunucuları | Kaynak kod + otomatik deploy | Ücretsiz |
| **Google Cloud** | Google sunucuları | Google ile giriş (OAuth) | Ücretsiz |

## Veri Akışı

### Kullanıcı giriş yapar:
```
Tarayıcı → Supabase Auth → Google OAuth (opsiyonel) → Session oluşur
```

### Hisse fiyatları yüklenir:
```
Tarayıcı → Railway /api/stocks → TradingView API → Fiyatlar döner
```

### Hisse alınır:
```
Tarayıcı → Supabase DB (portfolio tablosu + transactions tablosu + bakiye güncelle)
```

### Sayfa açılır:
```
Tarayıcı → Railway (dist/index.html + JS bundle) → React Native Web App render edilir
```

## Deploy Akışı

```
Sen kod değiştirirsin
    → git push origin main
        → GitHub Actions tetiklenir
            → Docker image build edilir → ghcr.io'ya push edilir
        → Railway otomatik algılar
            → Yeni container build edilir
            → Eski container kapatılır, yeni açılır
            → www.finanswebte.com güncellenir (zero downtime)
```

## Teknoloji Yığını

### Frontend (Kullanıcı Arayüzü)
- **React Native** (Expo SDK 52) - Mobil ve web uyumlu
- **TypeScript** - Tip güvenliği
- **Zustand** - State management
- **React Navigation** - Sayfa geçişleri

### Backend (Sunucu Tarafı)
- **Node.js + Express** - Proxy server
- **Docker** - Container'ize deployment
- **Supabase** - PostgreSQL + Auth + RLS

### Altyapı
- **Railway** - Container hosting
- **GitHub Actions** - CI/CD (otomatik build & deploy)
- **Natro** - DNS yönetimi
- **Let's Encrypt** - HTTPS sertifikası (Railway otomatik)

## Veritabanı Şeması

```sql
profiles        → Kullanıcı bilgileri, bakiye, faiz oranı
portfolio       → Sahip olunan hisseler (sembol, adet, alış fiyatı, tarih)
transactions    → Tüm işlem geçmişi (alış, satış, yatırma, çekme)
watchlist_groups → Takip listeleri (birden fazla liste)
watchlist_items  → Takip edilen hisseler
```

## Güvenlik

- **Row Level Security (RLS)**: Her kullanıcı sadece kendi verisini okur/yazar
- **Anon Key**: Public, sadece RLS kuralları dahilinde erişim sağlar
- **Service Role Key**: Gizli, sadece backend'de kullanılır (paylaşılmaz)
- **HTTPS**: Tüm trafik şifreli (Railway otomatik sertifika)
- **OAuth 2.0**: Google login güvenli token exchange ile çalışır

## URL'ler

| Servis | URL |
|--------|-----|
| Canlı Uygulama | https://www.finanswebte.com |
| Railway Dashboard | https://railway.app (proje: kiro-borsa-takip) |
| Supabase Dashboard | https://supabase.com/dashboard/project/qffqyeuwqmqrtemxxpdx |
| GitHub Repo | https://github.com/ersinkaya/kiro-borsa-takip |
| Docker Image | ghcr.io/ersinkaya/kiro-borsa-takip:latest |
| Google Cloud Console | https://console.cloud.google.com |
| Natro Panel | https://natro.com (domain: finanswebte.com) |
