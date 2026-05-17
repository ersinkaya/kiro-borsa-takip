const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

app.use(cors());
app.use(express.json());

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

// --- AI Analysis Endpoint (Gemini) ---
const AI_CACHE = new Map(); // { symbol: { data, timestamp } }
const AI_CACHE_TTL = 60 * 60 * 1000; // 1 saat

app.get('/api/ai-analysis/:symbol', async (req, res) => {
  const { symbol } = req.params;
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyCMpzYB1UqNn4L9HdSiZTaaOPjumAxjezw';

  if (!GEMINI_API_KEY) {
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

    // Gemini API çağrısı
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.json({ symbol, analysis: null, error: 'AI analiz alınamadı' });
    }

    const geminiData = await geminiRes.json();
    const analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || null;

    if (analysis) {
      // Cache'e kaydet
      AI_CACHE.set(symbol, { data: analysis, timestamp: Date.now() });
    }

    res.json({ symbol, analysis, cached: false });
  } catch (error) {
    console.error('AI analysis error:', error.message);
    res.json({ symbol, analysis: null, error: 'AI analiz hatası' });
  }
});

// --- Static Files (Expo Web Build) ---
// Serve all static files from dist
app.use(express.static(path.join(__dirname, 'dist'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
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
