# Borsa Takip - BIST Portföy Yönetimi

BIST (Borsa İstanbul) hisse senetlerini takip edebileceğiniz, portföy yönetimi yapabileceğiniz ve kar/zarar analizlerinizi faiz ile karşılaştırabileceğiniz mobil uygulama.

## Özellikler

- **Piyasa Takibi**: BIST'teki tüm hisselerin fiyatlarını 15 dakika gecikmeli olarak görüntüleme
- **Portföy Yönetimi**: Hangi hisseyi, ne zaman, ne kadar aldığınızı takip etme
- **Alım/Satım İşlemleri**: TL hesabınız üzerinden hisse alıp satma
- **TL Hesap Yönetimi**: Para yatırma/çekme, bakiye takibi
- **Faiz Karşılaştırması**: Portföy getirinizi faiz getirisi ile kıyaslama
- **Performans Analizi**: En iyi/kötü performans gösteren hisseler, genel metrikler

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npx expo start
```

## Teknolojiler

- **React Native** (Expo)
- **TypeScript**
- **Zustand** (State Management)
- **React Navigation** (Navigasyon)
- **AsyncStorage** (Yerel Veri Saklama)
- **Yahoo Finance API** (Hisse Fiyatları - 15dk gecikmeli)

## Proje Yapısı

```
src/
├── constants/       # Sabitler (tema, hisse listesi)
├── navigation/      # Navigasyon yapısı
├── screens/         # Ekranlar
│   ├── MarketScreen       # Piyasa takip
│   ├── PortfolioScreen    # Portföy görüntüleme
│   ├── TradeScreen        # Alım/Satım
│   ├── AccountScreen      # Hesap yönetimi
│   ├── AnalysisScreen     # Analiz & faiz karşılaştırma
│   └── StockDetailScreen  # Hisse detay
├── services/        # API servisleri
├── store/           # Zustand state management
└── types/           # TypeScript tipleri
```

## API Hakkında

Uygulama Yahoo Finance API kullanarak BIST hisse fiyatlarını çeker. Bu API ücretsizdir ve 15 dakika gecikmeli veri sağlar. Gerçek zamanlı veri için CollectAPI veya benzeri ücretli bir servise geçiş yapılabilir.

## Notlar

- İlk açılışta hesabınıza TL yatırmanız gerekir (Hesap sekmesinden)
- Hisse alımları TL bakiyenizden düşülür
- Satış gelirleri TL bakiyenize eklenir
- Faiz karşılaştırması yıllık oran üzerinden günlük hesaplanır
- Veriler cihazda yerel olarak saklanır (AsyncStorage)
