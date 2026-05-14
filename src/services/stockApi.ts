import { Stock } from '../types';
import { BIST_STOCKS } from '../constants/stocks';

/**
 * TradingView Scanner API kullanarak BIST hisse fiyatlarını çeker.
 * Gerçek zamanlı veri, CORS sorunu yok, ücretsiz.
 */

const TRADINGVIEW_SCAN_URL = 'http://localhost:3001/api/stocks';

/**
 * TradingView'den tüm BIST hisselerini çeker
 */
async function fetchFromTradingView(): Promise<Stock[]> {
  const stockMap = new Map(BIST_STOCKS.map(s => [s.symbol, s.name]));

  const body = {
    filter: [
      { left: 'exchange', operation: 'equal', right: 'BIST' },
    ],
    columns: ['name', 'close', 'change', 'volume', 'market_cap_basic'],
    sort: { sortBy: 'name', sortOrder: 'asc' },
    range: [0, 700],
  };

  const response = await fetch(TRADINGVIEW_SCAN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`TradingView API HTTP ${response.status}`);
  }

  const data = await response.json();

  if (!data || !data.data || !Array.isArray(data.data)) {
    throw new Error('TradingView API geçersiz yanıt');
  }

  const stocks: Stock[] = [];

  for (const item of data.data) {
    // item.s = "BIST:THYAO", item.d = ["THYAO", price, change%, volume, marketcap]
    const symbol = item.d?.[0] || '';
    const price = item.d?.[1] || 0;
    const change = item.d?.[2] || 0;
    const volume = item.d?.[3] || 0;

    if (symbol && price > 0) {
      const name = stockMap.get(symbol) || symbol;
      stocks.push({
        symbol,
        name,
        price: parseFloat(price.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        volume: Math.round(volume),
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return stocks;
}

/**
 * Ana fiyat çekme fonksiyonu
 */
export async function fetchStockPrices(): Promise<Stock[]> {
  try {
    console.log('TradingView API ile fiyatlar çekiliyor...');
    const stocks = await fetchFromTradingView();
    console.log(`${stocks.length} hisse fiyatı alındı`);

    if (stocks.length > 0) {
      return stocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
  } catch (error) {
    console.error('TradingView API hatası:', error);
  }

  // Fallback: fiyatsız liste
  console.log('API başarısız, fiyatsız liste döndürülüyor');
  return BIST_STOCKS.map(s => ({
    symbol: s.symbol,
    name: s.name,
    price: 0,
    change: 0,
    volume: 0,
    lastUpdated: new Date().toISOString(),
  }));
}

/**
 * Tek bir hissenin fiyatını çeker
 */
export async function fetchSingleStockPrice(symbol: string): Promise<number | null> {
  try {
    const body = {
      symbols: { tickers: [`BIST:${symbol}`] },
      columns: ['close'],
    };

    const response = await fetch(TRADINGVIEW_SCAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.data?.[0]?.d?.[0] || null;
  } catch {
    return null;
  }
}

/**
 * Birden fazla hissenin fiyatını çeker (portföy güncellemesi için)
 */
export async function fetchMultipleStockPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  try {
    const body = {
      symbols: { tickers: symbols.map(s => `BIST:${s}`) },
      columns: ['name', 'close'],
    };

    const response = await fetch(TRADINGVIEW_SCAN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) return prices;

    const data = await response.json();

    if (data && data.data) {
      for (const item of data.data) {
        const symbol = item.d?.[0] || '';
        const price = item.d?.[1] || 0;
        if (symbol && price > 0) {
          prices[symbol] = price;
        }
      }
    }
  } catch (error) {
    console.error('Çoklu fiyat çekme hatası:', error);
  }

  return prices;
}
