const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// TradingView proxy endpoint
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

// Yahoo Finance geçmiş veri endpoint
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = parseInt(req.query.days) || 30;
    const now = Math.floor(Date.now() / 1000);
    const from = now - days * 86400;

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.IS?interval=1d&period1=${from}&period2=${now}`;
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Yahoo Finance API error' });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: 'Veri bulunamadı' });
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

    // Değişim yüzdesi hesapla
    const historyWithChange = history.map((item, i) => {
      const prevClose = i > 0 ? history[i - 1].close : item.open;
      const change = prevClose > 0 ? ((item.close - prevClose) / prevClose) * 100 : 0;
      return { ...item, change: parseFloat(change.toFixed(2)) };
    });

    res.json({ symbol, data: historyWithChange.reverse() });
  } catch (error) {
    console.error('History proxy error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
