# Borsa Takip - BIST Portföy Yönetimi

BIST (Borsa İstanbul) hisse senetlerini takip edebileceğiniz, portföy yönetimi yapabileceğiniz ve yapay zeka destekli analiz alabileceğiniz web uygulaması. PWA desteği ile telefonunuza uygulama olarak yüklenebilir.

🌐 **Canlı:** https://www.finanswebte.com

## Özellikler

- **Takip Listesi**: Birden fazla liste oluşturup favori hisselerinizi takip edin
- **Piyasa Ekranı**: 560+ BIST hissesinin anlık fiyatları
- **Portföy Yönetimi**: Alış/satış takibi, kar/zarar (TL ve %), bakiye yönetimi
- **İşlem Geçmişi**: Hisse bazlı filtreleme, realize edilen kar/zarar, detaylı geçmiş
- **Yapay Zeka Analizi**: Groq AI ile teknik analiz ve görüş (RSI, SMA, destek/direnç)
- **Hisse Detay**: TradingView grafikleri (mum, RSI, Fibonacci), geçmiş fiyat tablosu
- **PWA**: Telefonunuza uygulama olarak yüklenebilir (Android + iOS)
- **Kullanıcı Sistemi**: Email/şifre + Google OAuth ile giriş

## Teknolojiler

### Frontend
- React Native (Expo SDK 52) + TypeScript
- Zustand (state management)
- React Navigation
- TradingView Widget (profesyonel grafikler)

### Backend
- Node.js + Express
- PostgreSQL 16
- JWT tabanlı kimlik doğrulama
- Google OAuth 2.0
- Groq AI (Llama 3.1 8b)

### Altyapı
- Docker + Docker Compose
- Nginx (reverse proxy + SSL)
- Let's Encrypt (HTTPS)
- GitHub Actions (CI/CD)
- Keyubu VDS (İstanbul)

## Kurulum (Lokal Geliştirme)

```bash
# Bağımlılıkları yükle
npm install

# Web uygulamasını başlat
npx expo start --web
```

## Docker ile Çalıştırma

```bash
docker compose up --build
```

Uygulama: http://localhost:3000

## Deploy

Her `main` branch'e push yapıldığında:
1. GitHub Actions Docker image build eder → `ghcr.io/ersinkaya/kiro-borsa-takip:latest`
2. Sunucuda:
```bash
cd /opt/borsa-takip
docker pull ghcr.io/ersinkaya/kiro-borsa-takip:latest
docker compose down && docker compose up -d
```

## Proje Yapısı

```
├── docker-server.js         # Ana sunucu (API + static files)
├── auth-server.js           # JWT auth + Google OAuth
├── portfolio-api.js         # Portföy/watchlist API endpoints
├── db-schema.sql            # PostgreSQL şeması
├── docker-compose.yml       # Docker servisleri
├── Dockerfile               # Build yapılandırması
├── public/                  # PWA dosyaları (manifest, SW, ikon)
├── scripts/                 # Build scriptleri
└── src/
    ├── components/          # TradeModal, QRCodeModal
    ├── constants/           # Tema, hisse listesi, versiyon
    ├── navigation/          # Tab navigasyon
    ├── screens/             # 8 ekran
    ├── services/            # API servisleri
    ├── store/               # Zustand store'ları
    ├── types/               # TypeScript tipleri
    └── utils/               # Yardımcı fonksiyonlar
```

## Ekranlar

| Sekme | Açıklama |
|-------|----------|
| Takip | Birden fazla takip listesi, anlık fiyatlar |
| Piyasa | 560+ BIST hissesi, arama, sıralama |
| Portföy | Hisseler, kar/zarar, bakiye, TL yatır/çek |
| İşlemler | Hisse bazlı geçmiş, filtre, realize K/Z |
| Analiz | Performans metrikleri, faiz karşılaştırması |

## Telefondan Kullanım (PWA)

- **Android (Chrome)**: Siteyi aç → ⋮ menü → "Uygulamayı yükle"
- **iPhone (Safari)**: Siteyi aç → Paylaş → "Ana Ekrana Ekle"

## Lisans

Private repository.
