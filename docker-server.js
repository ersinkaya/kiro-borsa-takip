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
