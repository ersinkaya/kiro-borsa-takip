# Borsa Takip - BIST Portföy Yönetimi

BIST (Borsa İstanbul) hisse senetlerini takip edebileceğiniz, portföy yönetimi yapabileceğiniz ve kar/zarar analizlerinizi faiz ile karşılaştırabileceğiniz mobil uygulama.

## Özellikler

- **Takip Listesi**: Favori hisselerinizi ekleyip anlık fiyatlarını takip edin
- **Piyasa Ekranı**: BIST'teki 630+ hissenin fiyatlarını gerçek zamanlı görüntüleme
- **Portföy Yönetimi**: Hangi hisseyi, ne zaman, ne kadar aldığınızı takip etme, kar/zarar (TL ve %) gösterimi
- **Alım/Satım**: Takip listesinden veya piyasa ekranından doğrudan hisse alıp satma
- **TL Hesap Yönetimi**: Portföy ekranından para yatırma/çekme, bakiye ve toplam varlık takibi
- **İşlem Geçmişi**: Tüm alım/satım işlemlerinin tarih, saat, fiyat detaylarıyla kaydı
- **Faiz Karşılaştırması**: Portföy getirinizi faiz getirisi ile kıyaslama (ayarlanabilir oran)
- **Performans Analizi**: En iyi/kötü performans gösteren hisseler, genel metrikler

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Proxy server'ı başlat (fiyat verisi için gerekli)
npm run proxy

# Başka bir terminalde uygulamayı başlat
npx expo start --web --tunnel
```

## Çalıştırma

Uygulama iki bileşenden oluşur:

1. **Proxy Server** (port 3001): TradingView API'ye erişim sağlar
2. **Expo Web/Mobil** (port 8081): Uygulama arayüzü

```bash
# Terminal 1 - Proxy server
npm run proxy

# Terminal 2 - Uygulama
npx expo start --web --tunnel
```

- **Web**: http://localhost:8081
- **Mobil**: Expo Go uygulamasıyla QR kodu okutun (tunnel modu ile farklı ağdan da bağlanabilirsiniz)

## Teknolojiler

- **React Native** (Expo SDK 52)
- **TypeScript**
- **Zustand** (State Management)
- **React Navigation** (Navigasyon)
- **AsyncStorage** (Yerel Veri Saklama)
- **TradingView Scanner API** (Hisse Fiyatları - gerçek zamanlı)
- **Express** (Proxy Server)

## Proje Yapısı

```
├── proxy-server.js          # TradingView API proxy
├── App.tsx                  # Ana uygulama bileşeni
└── src/
    ├── components/          # Yeniden kullanılabilir bileşenler
    │   ├── TradeModal       # Alım/Satım modalı
    │   └── QRCodeModal      # Mobil bağlantı QR kodu
    ├── constants/           # Sabitler (tema, hisse listesi)
    ├── navigation/          # Navigasyon yapısı
    ├── screens/             # Ekranlar
    │   ├── WatchlistScreen  # Takip listesi (anasayfa)
    │   ├── MarketScreen     # Piyasa takip
    │   ├── PortfolioScreen  # Portföy görüntüleme + bakiye
    │   ├── AccountScreen    # İşlem geçmişi
    │   ├── AnalysisScreen   # Analiz & faiz karşılaştırma
    │   └── StockDetailScreen # Hisse detay
    ├── services/            # API servisleri
    ├── store/               # Zustand state management
    ├── types/               # TypeScript tipleri
    └── utils/               # Yardımcı fonksiyonlar (format, alert)
```

## Ekran Yapısı

| Sekme | Açıklama |
|-------|----------|
| Takip | Favori hisselerinizi takip edin, alım/satım yapın |
| Piyasa | Tüm BIST hisselerini arayın ve görüntüleyin |
| Portföy | Sahip olduğunuz hisseler, kar/zarar, bakiye yönetimi |
| İşlemler | Alım/satım geçmişi (tarih, saat, fiyat) |
| Analiz | Faiz karşılaştırması, performans metrikleri |

## API Hakkında

Uygulama TradingView Scanner API kullanarak BIST hisse fiyatlarını çeker. Bu API ücretsizdir ve gerçek zamanlı veri sağlar. Tarayıcıdan CORS kısıtlaması nedeniyle bir proxy server üzerinden erişilir.

## Notlar

- İlk açılışta Portföy sekmesinden hesabınıza TL yatırın
- Takip listesine veya piyasa ekranından 🛒 ikonuyla hisse alabilirsiniz
- Hisse satışları FIFO (ilk alınan ilk satılır) mantığıyla çalışır
- Faiz karşılaştırması yıllık oran üzerinden günlük hesaplanır (varsayılan %50)
- Para birimleri Türkçe formatta gösterilir (₺1.234.567,89)
- Veriler cihazda yerel olarak saklanır (AsyncStorage)
- Tunnel modu ile farklı WiFi ağından da telefonla bağlanabilirsiniz

## Docker ile Çalıştırma

Uygulama Docker ile tek komutla ayağa kaldırılabilir. Web app ve API aynı container'da port 3000'den sunulur.

### Lokal Build

```bash
docker compose up --build
```

Uygulama: http://localhost:3000

### GitHub Container Registry'den Çekme

```bash
docker pull ghcr.io/ersinkaya/kiro-borsa-takip:latest
docker run -p 3000:3000 ghcr.io/ersinkaya/kiro-borsa-takip:latest
```

### CI/CD

Her `main` branch'e push yapıldığında GitHub Actions otomatik olarak Docker image build edip `ghcr.io/ersinkaya/kiro-borsa-takip:latest` adresine push eder.

### Herhangi Bir Sunucuya Deploy

```bash
# Sunucuda
docker pull ghcr.io/ersinkaya/kiro-borsa-takip:latest
docker run -d -p 80:3000 --restart unless-stopped ghcr.io/ersinkaya/kiro-borsa-takip:latest
```
