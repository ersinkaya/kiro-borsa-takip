import { Stock } from '../types';
import { BIST_STOCKS } from '../constants/stocks';

/**
 * BIST hisse fiyatlarını çekmek için birden fazla kaynak dener.
 * 1. İş Yatırım API (CORS proxy ile)
 * 2. Yahoo Finance (CORS proxy ile)
 * 3. Fallback: Simüle edilmiş veri
 */

const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
];

/**
 * İş Yatırım API'sinden tüm BIST hisselerinin fiyatlarını çeker
 */
async function fetchFromIsYatirim(): Promise<Stock[]> {
  const url = 'https://www.isyatirim.com.tr/_layouts/15/Jeeves/Jes498/Jeeves.ashx?Q=/bist/hisseyuzeysel&A=last|dailyChangePercentage|dailyVolume&D=BIST&S=&T=&B=&G=s';

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url), {
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) continue;

      const data = await response.json();

      if (data && data.result && Array.isArray(data.result)) {
        const stocks: Stock[] = [];
        const stockMap = new Map(BIST_STOCKS.map(s => [s.symbol, s.name]));

        for (const item of data.result) {
          const symbol = item.c?.[0] || '';
          const name = stockMap.get(symbol) || symbol;
          const price = parseFloat(item.c?.[1]) || 0;
          const change = parseFloat(item.c?.[2]) || 0;
          const volume = parseFloat(item.c?.[3]) || 0;

          if (symbol) {
            stocks.push({
              symbol,
              name,
              price,
              change,
              volume,
              lastUpdated: new Date().toISOString(),
            });
          }
        }

        if (stocks.length > 0) return stocks;
      }
    } catch (error) {
      console.log('İş Yatırım API hatası, sonraki proxy deneniyor...', error);
      continue;
    }
  }

  throw new Error('İş Yatırım API erişilemedi');
}

/**
 * Yahoo Finance API'sinden fiyat çeker (CORS proxy ile)
 */
async function fetchFromYahoo(symbols: string[]): Promise<Stock[]> {
  const stocks: Stock[] = [];
  const batchSize = 5;
  const stockMap = new Map(BIST_STOCKS.map(s => [s.symbol, s.name]));

  for (let i = 0; i < Math.min(symbols.length, 50); i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);

    const promises = batch.map(async (symbol) => {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&range=1d`;

      for (const proxy of CORS_PROXIES) {
        try {
          const response = await fetch(proxy + encodeURIComponent(yahooUrl));
          if (!response.ok) continue;

          const data = await response.json();
          const result = data.chart?.result?.[0];

          if (result) {
            const meta = result.meta;
            const price = meta.regularMarketPrice || 0;
            const previousClose = meta.chartPreviousClose || meta.previousClose || price;
            const change = previousClose > 0
              ? ((price - previousClose) / previousClose) * 100
              : 0;

            return {
              symbol,
              name: stockMap.get(symbol) || symbol,
              price,
              change: parseFloat(change.toFixed(2)),
              volume: meta.regularMarketVolume || 0,
              lastUpdated: new Date().toISOString(),
            } as Stock;
          }
        } catch {
          continue;
        }
      }
      return null;
    });

    const results = await Promise.allSettled(promises);
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        stocks.push(result.value);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  return stocks;
}

/**
 * Alternatif: doviz.com üzerinden BIST verisi çekme
 */
async function fetchFromDovizCom(): Promise<Stock[]> {
  const url = 'https://www.doviz.com/api/v10/stocks/all/A';
  const stocks: Stock[] = [];
  const stockMap = new Map(BIST_STOCKS.map(s => [s.symbol, s.name]));

  // Tüm harfler için çek
  const letters = 'ABCDEFGHIJKLMNOPRSTUVYZ';

  for (const letter of letters) {
    for (const proxy of CORS_PROXIES) {
      try {
        const response = await fetch(
          proxy + encodeURIComponent(`https://www.doviz.com/api/v10/stocks/all/${letter}`)
        );

        if (!response.ok) continue;

        const data = await response.json();

        if (Array.isArray(data)) {
          for (const item of data) {
            const symbol = item.code || item.symbol || '';
            const name = stockMap.get(symbol) || item.name || symbol;
            const price = parseFloat(item.price || item.last || '0');
            const change = parseFloat(item.changePercentage || item.change_percentage || '0');

            if (symbol && price > 0) {
              stocks.push({
                symbol,
                name,
                price,
                change,
                volume: parseInt(item.volume || '0'),
                lastUpdated: new Date().toISOString(),
              });
            }
          }
          break; // Bu proxy çalıştı, sonraki harfe geç
        }
      } catch {
        continue;
      }
    }
  }

  return stocks;
}

/**
 * Ana fiyat çekme fonksiyonu - birden fazla kaynak dener
 */
export async function fetchStockPrices(): Promise<Stock[]> {
  const stockMap = new Map(BIST_STOCKS.map(s => [s.symbol, s.name]));

  // 1. İş Yatırım API'yi dene
  try {
    console.log('İş Yatırım API deneniyor...');
    const stocks = await fetchFromIsYatirim();
    if (stocks.length > 50) {
      console.log(`İş Yatırım'dan ${stocks.length} hisse alındı`);
      return mergeWithFullList(stocks, stockMap);
    }
  } catch (e) {
    console.log('İş Yatırım başarısız:', e);
  }

  // 2. doviz.com API'yi dene
  try {
    console.log('doviz.com API deneniyor...');
    const stocks = await fetchFromDovizCom();
    if (stocks.length > 50) {
      console.log(`doviz.com'dan ${stocks.length} hisse alındı`);
      return mergeWithFullList(stocks, stockMap);
    }
  } catch (e) {
    console.log('doviz.com başarısız:', e);
  }

  // 3. Yahoo Finance'i dene (ilk 50 hisse)
  try {
    console.log('Yahoo Finance API deneniyor...');
    const topSymbols = ['THYAO', 'ASELS', 'GARAN', 'AKBNK', 'KCHOL', 'SAHOL', 'EREGL',
      'BIMAS', 'FROTO', 'TOASO', 'TCELL', 'TUPRS', 'SISE', 'PGSUS', 'TAVHL',
      'ISCTR', 'HALKB', 'VAKBN', 'YKBNK', 'EKGYO', 'ENKAI', 'TTKOM', 'MGROS',
      'ARCLK', 'PETKM', 'DOHOL', 'SOKM', 'KOZAL', 'TTRAK', 'OTKAR',
      'ASTOR', 'MPARK', 'LOGO', 'DOAS', 'TKFEN', 'CCOLA', 'ULKER', 'AYGAZ',
      'ENJSA', 'AKSEN', 'GUBRF', 'KORDS', 'BRISA', 'VESTL', 'ISGYO', 'TSKB'];
    const stocks = await fetchFromYahoo(topSymbols);
    if (stocks.length > 10) {
      console.log(`Yahoo Finance'den ${stocks.length} hisse alındı`);
      return mergeWithFullList(stocks, stockMap);
    }
  } catch (e) {
    console.log('Yahoo Finance başarısız:', e);
  }

  // 4. Hiçbiri çalışmazsa boş liste döndür (fiyatsız)
  console.log('Tüm API kaynakları başarısız, fiyatsız liste döndürülüyor');
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
 * API'den gelen verileri tam hisse listesiyle birleştirir
 */
function mergeWithFullList(apiStocks: Stock[], stockMap: Map<string, string>): Stock[] {
  const priceMap = new Map(apiStocks.map(s => [s.symbol, s]));

  const allStocks: Stock[] = BIST_STOCKS.map(s => {
    const apiData = priceMap.get(s.symbol);
    if (apiData) {
      return { ...apiData, name: s.name };
    }
    return {
      symbol: s.symbol,
      name: s.name,
      price: 0,
      change: 0,
      volume: 0,
      lastUpdated: new Date().toISOString(),
    };
  });

  // API'den gelen ama listede olmayan hisseleri de ekle
  apiStocks.forEach(s => {
    if (!stockMap.has(s.symbol)) {
      allStocks.push(s);
    }
  });

  return allStocks.sort((a, b) => {
    // Fiyatı olanları üste koy
    if (a.price > 0 && b.price === 0) return -1;
    if (a.price === 0 && b.price > 0) return 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * Tek bir hissenin fiyatını çeker
 */
export async function fetchSingleStockPrice(symbol: string): Promise<number | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&range=1d`;
      const response = await fetch(proxy + encodeURIComponent(yahooUrl));
      if (!response.ok) continue;

      const data = await response.json();
      const result = data.chart?.result?.[0];
      return result?.meta?.regularMarketPrice || null;
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Birden fazla hissenin fiyatını çeker (portföy güncellemesi için)
 */
export async function fetchMultipleStockPrices(
  symbols: string[]
): Promise<Record<string, number>> {
  const prices: Record<string, number> = {};

  const promises = symbols.map(async (symbol) => {
    const price = await fetchSingleStockPrice(symbol);
    if (price !== null) {
      prices[symbol] = price;
    }
  });

  await Promise.allSettled(promises);
  return prices;
}
