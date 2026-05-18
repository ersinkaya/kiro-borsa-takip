const express = require('express');
const cors = require('cors');
const path = require('path');
const { setupAuthRoutes } = require('./auth-server');
const { setupPortfolioRoutes } = require('./portfolio-api');
const app = express();

app.use(cors());
app.use(express.json());

// --- Auth Routes ---
setupAuthRoutes(app);

// --- Portfolio & Watchlist Routes ---
setupPortfolioRoutes(app);

// --- API Endpoints (Proxy) ---

// TradingView proxy
app.post('/api/stocks', async (req, res) => {
  try {
    const response = await fetch('https://scanner.tradingview.com/turkey/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TradingView API error' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Geçmiş veri endpoint - TradingView + Yahoo fallback
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 30;

    // Önce TradingView'den dene
    try {
      const tvResponse = await fetch('https://scanner.tradingview.com/turkey/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbols: { tickers: [`BIST:${symbol}`] },
          columns: ['close', 'open', 'high', 'low', 'volume', 'change', 'Perf.1M', 'High.1M', 'Low.1M'],
        }),
      });

      if (tvResponse.ok) {
        const tvData = await tvResponse.json();
        // TradingView scanner sadece anlık veri verir, geçmiş için Yahoo'ya düş
      }
    } catch (e) {}

    // Yahoo Finance
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&period1=${from}&period2=${now}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      // Yahoo başarısız - boş veri dön
      return res.json({ symbol, data: [] });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return res.json({ symbol, data: [] });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};

    const history = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: quote.close?.[i] || 0,
      open: quote.open?.[i] || 0,
      high: quote.high?.[i] || 0,
      low: quote.low?.[i] || 0,
      volume: quote.volume?.[i] || 0,
    })).filter(item => item.close > 0);

    const historyWithChange = history.map((item, i) => {
      const prevClose = i > 0 ? history[i - 1].close : item.open;
      const change = prevClose > 0 ? ((item.close - prevClose) / prevClose) * 100 : 0;
      return { ...item, change: parseFloat(change.toFixed(2)) };
    });

    res.json({ symbol, data: historyWithChange.reverse() });
  } catch (error) {
    console.error('History proxy error:', error.message);
    res.json({ symbol: req.params.symbol, data: [] });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- İndikatör Tarama Endpoint ---
app.get('/api/indicators/scan', async (req, res) => {
  try {
    // TradingView'den tüm BIST hisselerinin teknik verilerini çek
    const body = {
      filter: [
        { left: 'exchange', operation: 'equal', right: 'BIST' },
        { left: 'is_primary', operation: 'equal', right: true },
      ],
      columns: [
        'name', 'close', 'change', 'volume',
        'EMA20', 'EMA50', 'EMA200',
        'SMA20', 'SMA50',
        'RSI', 'RSI[1]',
        'MACD.macd', 'MACD.signal',
        'BB.upper', 'BB.lower', 'BB.basis',
        'ADX', 'ADX+DI', 'ADX-DI',
        'average_volume_10d_calc',
        'average_volume_30d_calc',
        'Perf.W', 'Perf.1M',
        'High.1M', 'Low.1M',
      ],
      sort: { sortBy: 'volume', sortOrder: 'desc' },
      range: [0, 700],
    };

    const response = await fetch('https://scanner.tradingview.com/turkey/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'TradingView API error' });
    }

    const data = await response.json();
    const stocks = (data.data || []).map(item => {
      const d = item.d || [];
      return {
        symbol: d[0] || '',
        close: d[1] || 0,
        change: d[2] || 0,
        volume: d[3] || 0,
        ema20: d[4],
        ema50: d[5],
        ema200: d[6],
        sma20: d[7],
        sma50: d[8],
        rsi: d[9],
        rsiPrev: d[10],
        macd: d[11],
        macdSignal: d[12],
        bbUpper: d[13],
        bbLower: d[14],
        bbBasis: d[15],
        adx: d[16],
        adxPlus: d[17],
        adxMinus: d[18],
        avgVol10: d[19],
        avgVol30: d[20],
        perfWeek: d[21],
        perf1M: d[22],
        high1M: d[23],
        low1M: d[24],
      };
    }).filter(s => s.symbol && s.close > 0);

    // 6 İndikatör Senaryosu
    const results = {
      trendStart: [],       // 1) Trend başlangıcı
      bottomReversal: [],   // 2) Dipten dönüş
      squeeze: [],          // 3) Sıkışma (Bollinger)
      strongTrend: [],      // 4) Güçlü trend devamı
      breakout: [],         // 5) Kırılım
      institutional: [],    // 6) Kurumsal giriş
    };

    for (const s of stocks) {
      if (!s.ema20 || !s.ema50 || !s.rsi) continue;

      // 1) Trend Başlangıcı: EMA20 > EMA50 (yakın kesişim), RSI > 50, Hacim yüksek
      if (s.ema20 > s.ema50 && s.ema20 < s.ema50 * 1.02 && s.rsi > 50 && s.rsi < 70 && s.volume > (s.avgVol10 || s.volume) * 1.2) {
        results.trendStart.push({ symbol: s.symbol, close: s.close, change: s.change, rsi: s.rsi, volume: s.volume, ema20: s.ema20, ema50: s.ema50 });
      }

      // 2) Dipten Dönüş: RSI önceden < 30, şimdi > 30, MACD yukarı kesişim, hacim artıyor
      if (s.rsiPrev !== null && s.rsiPrev < 35 && s.rsi > 30 && s.rsi < 50 && s.macd > s.macdSignal && s.volume > (s.avgVol10 || s.volume)) {
        results.bottomReversal.push({ symbol: s.symbol, close: s.close, change: s.change, rsi: s.rsi, rsiPrev: s.rsiPrev, macd: s.macd, volume: s.volume });
      }

      // 3) Sıkışma: Bollinger bantları dar, hacim artıyor, fiyat üst banda yakın
      if (s.bbUpper && s.bbLower && s.bbBasis) {
        const bandWidth = (s.bbUpper - s.bbLower) / s.bbBasis;
        const pricePosition = (s.close - s.bbLower) / (s.bbUpper - s.bbLower);
        if (bandWidth < 0.08 && pricePosition > 0.6 && s.volume > (s.avgVol10 || s.volume) * 0.9) {
          results.squeeze.push({ symbol: s.symbol, close: s.close, change: s.change, bandWidth: (bandWidth * 100).toFixed(1), pricePosition: (pricePosition * 100).toFixed(0), volume: s.volume });
        }
      }

      // 4) Güçlü Trend Devamı: EMA20 > EMA50 > EMA200, ADX > 25, RSI 50-70
      if (s.ema200 && s.ema20 > s.ema50 && s.ema50 > s.ema200 && s.adx > 25 && s.rsi > 50 && s.rsi < 70) {
        results.strongTrend.push({ symbol: s.symbol, close: s.close, change: s.change, adx: s.adx, rsi: s.rsi, ema20: s.ema20, ema50: s.ema50, ema200: s.ema200 });
      }

      // 5) Kırılım: Fiyat 1 aylık yüksek yakınında, hacim normalin 2x+, RSI 55-65
      if (s.high1M && s.close > s.high1M * 0.97 && s.volume > (s.avgVol30 || s.volume) * 2 && s.rsi > 55 && s.rsi < 70) {
        results.breakout.push({ symbol: s.symbol, close: s.close, change: s.change, rsi: s.rsi, volume: s.volume, avgVol: s.avgVol30, high1M: s.high1M });
      }

      // 6) Kurumsal Giriş: Fiyat yükseliyor, hacim artıyor, RSI güçlü
      if (s.change > 0 && s.volume > (s.avgVol10 || s.volume) * 1.5 && s.rsi > 50 && s.rsi < 75 && s.perfWeek > 0) {
        results.institutional.push({ symbol: s.symbol, close: s.close, change: s.change, rsi: s.rsi, volume: s.volume, avgVol: s.avgVol10, perfWeek: s.perfWeek });
      }
    }

    // Her kategoride en fazla 20 hisse, hacme göre sırala
    for (const key of Object.keys(results)) {
      results[key] = results[key].sort((a, b) => (b.volume || 0) - (a.volume || 0)).slice(0, 20);
    }

    res.json({
      timestamp: new Date().toISOString(),
      totalScanned: stocks.length,
      results,
    });
  } catch (error) {
    console.error('Indicator scan error:', error.message);
    res.status(500).json({ error: 'Tarama hatası: ' + error.message });
  }
});


// --- AI Analysis Endpoint (Gemini) ---
const AI_CACHE = new Map(); // { symbol: { data, timestamp } }
const AI_CACHE_TTL = 60 * 60 * 1000; // 1 saat

app.get('/api/ai-analysis/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

  if (!GROQ_API_KEY) {
    return res.json({ symbol, analysis: null, error: 'AI servisi yapılandırılmamış' });
  }

  // Cache kontrol
  const cached = AI_CACHE.get(symbol);
  if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
    return res.json({ symbol, analysis: cached.data, cached: true });
  }

  try {
    // Önce hisse fiyat verilerini Yahoo'dan çek
    const days = 30;
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;
    let priceHistory = [];

    try {
      const historyRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&period1=${from}&period2=${now}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      if (historyRes.ok) {
        const histData = await historyRes.json();
        const result = histData.chart?.result?.[0];
        if (result) {
          const timestamps = result.timestamp || [];
          const quote = result.indicators?.quote?.[0] || {};
          priceHistory = timestamps.map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            close: quote.close?.[i] || 0,
            change: 0,
          })).filter(item => item.close > 0).slice(-20);
        }
      }
    } catch (e) {}

    // TradingView'den güncel veri
    const tvRes = await fetch('https://scanner.tradingview.com/turkey/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbols: { tickers: [`BIST:${symbol}`] },
        columns: ['name', 'close', 'change', 'volume', 'High.1M', 'Low.1M', 'Perf.W', 'Perf.1M', 'Perf.3M', 'SMA20', 'SMA50', 'RSI'],
      }),
    });
    const tvData = await tvRes.json();
    const stockInfo = tvData.data?.[0]?.d || [];

    const priceHistoryForPrompt = priceHistory;
    const currentPrice = stockInfo[1] || 0;
    const change = stockInfo[2] || 0;
    const volume = stockInfo[3] || 0;
    const high1M = stockInfo[4] || 0;
    const low1M = stockInfo[5] || 0;
    const perfWeek = stockInfo[6] || 0;
    const perf1M = stockInfo[7] || 0;
    const perf3M = stockInfo[8] || 0;
    const sma20 = stockInfo[9] || 0;
    const sma50 = stockInfo[10] || 0;
    const rsi = stockInfo[11] || 0;

    const prompt = `Sen bir borsa analisti ve teknik analizcisin. Aşağıdaki BIST hissesi hakkında Türkçe kısa bir teknik analiz ve görüş yaz.

Hisse: ${symbol} (${stockInfo[0] || symbol})
Güncel Fiyat: ₺${currentPrice}
Günlük Değişim: %${change?.toFixed(2)}
Haftalık Performans: %${perfWeek?.toFixed(2)}
1 Aylık Performans: %${perf1M?.toFixed(2)}
3 Aylık Performans: %${perf3M?.toFixed(2)}
1 Aylık En Yüksek: ₺${high1M}
1 Aylık En Düşük: ₺${low1M}
SMA20: ₺${sma20?.toFixed(2)}
SMA50: ₺${sma50?.toFixed(2)}
RSI(14): ${rsi?.toFixed(1)}
Hacim: ${volume}

Son 1 aylık kapanış fiyatları (eskiden yeniye):
${priceHistoryForPrompt.slice(0, 20).map(d => `${d.date}: ₺${d.close}`).join('\n')}

Lütfen şu formatta yanıt ver:
📊 TREND: (Yükseliş/Düşüş/Yatay)
📈 DESTEK: ₺X | DİRENÇ: ₺Y
📉 TEKNİK GÖSTERGELER: (RSI, SMA yorumu)
💡 KISA VADELI GÖRÜŞ: (2-3 cümle)
⚠️ RİSKLER: (1-2 cümle)

Not: Kısa ve öz yaz, maksimum 150 kelime. Yatırım tavsiyesi olmadığını belirt.`;

    // Groq API çağrısı (Llama modeli)
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Sen bir borsa analisti ve teknik analizcisin. Türkçe yanıt ver. Kısa ve öz ol.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('Groq API error:', groqRes.status, errText);
      return res.json({ symbol, analysis: null, error: `AI API hata: ${groqRes.status} - ${errText.substring(0, 200)}` });
    }

    const groqData = await groqRes.json();
    const analysis = groqData.choices?.[0]?.message?.content || null;

    if (analysis) {
      // Cache'e kaydet
      AI_CACHE.set(symbol, { data: analysis, timestamp: Date.now() });
    }

    res.json({ symbol, analysis, cached: false });
  } catch (error) {
    console.error('AI analysis error:', error.message);
    res.json({ symbol, analysis: null, error: `AI analiz hatası: ${error.message}` });
  }
});

// --- Static Files (Expo Web Build) ---
// Serve all static files from dist
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.webmanifest')) {
      res.setHeader('Content-Type', 'application/manifest+json');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (filePath.endsWith('sw.js')) {
      // Service worker güncellenebilsin diye cache yok
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
    } else if (filePath.endsWith('.svg')) {
      res.setHeader('Content-Type', 'image/svg+xml');
    }
  }
}));

// SPA fallback - only for navigation routes (not files)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Borsa Takip running on http://0.0.0.0:${PORT}`);
  console.log(`  - Web App: http://localhost:${PORT}`);
  console.log(`  - API: http://localhost:${PORT}/api/stocks`);
  console.log(`  - Health: http://localhost:${PORT}/api/health`);
});
