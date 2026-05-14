// Hisse senedi bilgisi
export interface Stock {
  symbol: string; // Örn: "THYAO"
  name: string; // Örn: "Türk Hava Yolları"
  price: number; // Güncel fiyat
  change: number; // Değişim yüzdesi
  volume: number; // İşlem hacmi
  lastUpdated: string; // Son güncelleme zamanı
}

// Portföydeki hisse
export interface PortfolioItem {
  id: string;
  symbol: string;
  name: string;
  quantity: number; // Adet
  buyPrice: number; // Alış fiyatı (birim)
  buyDate: string; // Alış tarihi
  currentPrice: number; // Güncel fiyat
}

// İşlem kaydı
export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  symbol: string;
  name: string;
  quantity: number;
  price: number; // Birim fiyat
  totalAmount: number; // Toplam tutar (TL)
  date: string;
}

// TL Hesap
export interface Account {
  balance: number; // TL bakiye
  totalDeposit: number; // Toplam yatırılan
  totalWithdraw: number; // Toplam çekilen
}

// Faiz karşılaştırma
export interface InterestComparison {
  portfolioReturn: number; // Portföy getirisi (%)
  portfolioReturnTL: number; // Portföy getirisi (TL)
  interestReturn: number; // Faiz getirisi (%)
  interestReturnTL: number; // Faiz getirisi (TL)
  difference: number; // Fark (TL)
  startDate: string;
  totalInvested: number;
}
