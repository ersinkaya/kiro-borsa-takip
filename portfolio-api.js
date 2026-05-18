const { authMiddleware, pool } = require('./auth-server');

function setupPortfolioRoutes(app) {

  // ============ TÜM VERİLERİ YÜKLE ============
  app.get('/api/portfolio/data', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      // Profil
      const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      const profile = profileRes.rows[0] || { balance: 0, total_deposit: 0, total_withdraw: 0, interest_rate: 50 };

      // Portföy
      const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

      // İşlemler
      const transRes = await pool.query("SELECT * FROM transactions WHERE user_id = $1 AND type IN ('BUY', 'SELL') ORDER BY date DESC", [userId]);

      // Toplam realize edilen kar/zarar
      const realizedRes = await pool.query("SELECT COALESCE(SUM(realized_pnl), 0) as total_realized FROM transactions WHERE user_id = $1 AND type = 'SELL' AND realized_pnl IS NOT NULL", [userId]);
      const totalRealizedPnL = parseFloat(realizedRes.rows[0].total_realized);

      res.json({
        portfolio: portfolioRes.rows.map(p => ({
          id: String(p.id),
          symbol: p.symbol,
          name: p.name,
          quantity: p.quantity,
          buyPrice: parseFloat(p.buy_price),
          buyDate: p.buy_date,
          currentPrice: parseFloat(p.buy_price),
        })),
        transactions: transRes.rows.map(t => ({
          id: String(t.id),
          type: t.type,
          symbol: t.symbol,
          name: t.name,
          quantity: t.quantity,
          price: parseFloat(t.price),
          totalAmount: parseFloat(t.total_amount),
          date: t.date,
          realizedPnL: t.realized_pnl ? parseFloat(t.realized_pnl) : undefined,
        })),
        account: {
          balance: parseFloat(profile.balance),
          totalDeposit: parseFloat(profile.total_deposit),
          totalWithdraw: parseFloat(profile.total_withdraw),
        },
        interestRate: parseFloat(profile.interest_rate),
        totalRealizedPnL,
      });
    } catch (error) {
      console.error('Portfolio data error:', error);
      res.status(500).json({ error: 'Veri yükleme hatası' });
    }
  });

  // ============ HİSSE AL ============
  app.post('/api/portfolio/buy', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { symbol, name, quantity, buyPrice, buyDate, affectBalance } = req.body;
      const totalAmount = quantity * buyPrice;

      // Portföye ekle
      const portRes = await pool.query(
        'INSERT INTO portfolio (user_id, symbol, name, quantity, buy_price, buy_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, symbol, name, quantity, buyPrice, buyDate || new Date().toISOString()]
      );

      // İşlem kaydı
      const transRes = await pool.query(
        'INSERT INTO transactions (user_id, type, symbol, name, quantity, price, total_amount, date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [userId, 'BUY', symbol, name, quantity, buyPrice, totalAmount, buyDate || new Date().toISOString()]
      );

      // Bakiye düş (sadece affectBalance true ise)
      if (affectBalance) {
        await pool.query('UPDATE profiles SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2', [totalAmount, userId]);
      }

      const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      const profile = profileRes.rows[0];

      const p = portRes.rows[0];
      const t = transRes.rows[0];

      res.json({
        portfolioItem: { id: String(p.id), symbol: p.symbol, name: p.name, quantity: p.quantity, buyPrice: parseFloat(p.buy_price), buyDate: p.buy_date, currentPrice: parseFloat(p.buy_price) },
        transaction: { id: String(t.id), type: t.type, symbol: t.symbol, name: t.name, quantity: t.quantity, price: parseFloat(t.price), totalAmount: parseFloat(t.total_amount), date: t.date },
        account: { balance: parseFloat(profile.balance), totalDeposit: parseFloat(profile.total_deposit), totalWithdraw: parseFloat(profile.total_withdraw) },
      });
    } catch (error) {
      console.error('Buy error:', error);
      res.status(500).json({ error: 'Alım hatası' });
    }
  });

  // ============ HİSSE SAT ============
  app.post('/api/portfolio/sell', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const { symbol, name, quantity, sellPrice, sellDate, affectBalance } = req.body;
      const totalAmount = quantity * sellPrice;

      // Portföydeki hisseleri bul (FIFO - ilk alınan ilk satılır)
      const portRes = await pool.query(
        'SELECT * FROM portfolio WHERE user_id = $1 AND symbol = $2 ORDER BY buy_date ASC',
        [userId, symbol]
      );

      const items = portRes.rows;
      const totalOwned = items.reduce((sum, i) => sum + i.quantity, 0);

      if (totalOwned < quantity) {
        return res.status(400).json({ error: `Portföyünüzde ${totalOwned} adet ${symbol} var.` });
      }

      // FIFO satış + realized P&L hesapla
      let remainingToSell = quantity;
      let totalCostBasis = 0; // Satılan hisselerin toplam alış maliyeti

      for (const item of items) {
        if (remainingToSell <= 0) break;

        if (item.quantity <= remainingToSell) {
          // Tamamını sat
          totalCostBasis += item.quantity * parseFloat(item.buy_price);
          remainingToSell -= item.quantity;
          await pool.query('DELETE FROM portfolio WHERE id = $1', [item.id]);
        } else {
          // Kısmi satış
          totalCostBasis += remainingToSell * parseFloat(item.buy_price);
          await pool.query(
            'UPDATE portfolio SET quantity = quantity - $1 WHERE id = $2',
            [remainingToSell, item.id]
          );
          remainingToSell = 0;
        }
      }

      // Realized P&L
      const realizedPnL = totalAmount - totalCostBasis;

      // İşlem kaydı (realized_pnl ile)
      const transRes = await pool.query(
        'INSERT INTO transactions (user_id, type, symbol, name, quantity, price, total_amount, date, realized_pnl) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [userId, 'SELL', symbol, name, quantity, sellPrice, totalAmount, sellDate || new Date().toISOString(), realizedPnL]
      );

      // Bakiye ekle (sadece affectBalance true ise)
      if (affectBalance) {
        await pool.query('UPDATE profiles SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2', [totalAmount, userId]);
      }

      const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      const profile = profileRes.rows[0];

      const t = transRes.rows[0];

      // Güncel portföyü döndür
      const updatedPortRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

      res.json({
        transaction: {
          id: String(t.id), type: t.type, symbol: t.symbol, name: t.name,
          quantity: t.quantity, price: parseFloat(t.price), totalAmount: parseFloat(t.total_amount),
          date: t.date, realizedPnL: parseFloat(t.realized_pnl || 0),
        },
        portfolio: updatedPortRes.rows.map(p => ({
          id: String(p.id), symbol: p.symbol, name: p.name, quantity: p.quantity,
          buyPrice: parseFloat(p.buy_price), buyDate: p.buy_date, currentPrice: parseFloat(p.buy_price),
        })),
        account: {
          balance: parseFloat(profile.balance),
          totalDeposit: parseFloat(profile.total_deposit),
          totalWithdraw: parseFloat(profile.total_withdraw),
        },
        realizedPnL,
      });
    } catch (error) {
      console.error('Sell error:', error);
      res.status(500).json({ error: 'Satış hatası' });
    }
  });

  // ============ HİSSE SİL ============
  app.delete('/api/portfolio/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM portfolio WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Silme hatası' });
    }
  });

  // ============ PARA YATIR ============
  app.post('/api/portfolio/deposit', authMiddleware, async (req, res) => {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      await pool.query('UPDATE profiles SET balance = balance + $1, total_deposit = total_deposit + $1, updated_at = NOW() WHERE user_id = $2', [amount, userId]);
      await pool.query('INSERT INTO transactions (user_id, type, total_amount, date) VALUES ($1, $2, $3, NOW())', [userId, 'DEPOSIT', amount]);

      const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      const profile = profileRes.rows[0];

      res.json({ account: { balance: parseFloat(profile.balance), totalDeposit: parseFloat(profile.total_deposit), totalWithdraw: parseFloat(profile.total_withdraw) } });
    } catch (error) {
      res.status(500).json({ error: 'Yatırma hatası' });
    }
  });

  // ============ PARA ÇEK ============
  app.post('/api/portfolio/withdraw', authMiddleware, async (req, res) => {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      await pool.query('UPDATE profiles SET balance = balance - $1, total_withdraw = total_withdraw + $1, updated_at = NOW() WHERE user_id = $2', [amount, userId]);
      await pool.query('INSERT INTO transactions (user_id, type, total_amount, date) VALUES ($1, $2, $3, NOW())', [userId, 'WITHDRAW', amount]);

      const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      const profile = profileRes.rows[0];

      res.json({ account: { balance: parseFloat(profile.balance), totalDeposit: parseFloat(profile.total_deposit), totalWithdraw: parseFloat(profile.total_withdraw) } });
    } catch (error) {
      res.status(500).json({ error: 'Çekme hatası' });
    }
  });

  // ============ FAİZ ORANI ============
  app.post('/api/portfolio/interest-rate', authMiddleware, async (req, res) => {
    try {
      const { rate } = req.body;
      await pool.query('UPDATE profiles SET interest_rate = $1, updated_at = NOW() WHERE user_id = $2', [rate, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Güncelleme hatası' });
    }
  });

  // ============ PORTFÖY TEMİZLE ============
  app.post('/api/portfolio/clear', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      await pool.query('DELETE FROM portfolio WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await pool.query('UPDATE profiles SET balance = 0, total_deposit = 0, total_withdraw = 0, updated_at = NOW() WHERE user_id = $1', [userId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Temizleme hatası' });
    }
  });

  // ============ HESAP SIFIRLA ============
  app.post('/api/portfolio/reset', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      await pool.query('DELETE FROM portfolio WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
      await pool.query('UPDATE profiles SET balance = 0, total_deposit = 0, total_withdraw = 0, updated_at = NOW() WHERE user_id = $1', [userId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Sıfırlama hatası' });
    }
  });

  // ============ İŞLEM SİL (GERİ AL) ============
  app.delete('/api/portfolio/transaction/:id', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;
      const transId = req.params.id;

      const transRes = await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [transId, userId]);
      if (transRes.rows.length === 0) return res.status(404).json({ error: 'İşlem bulunamadı' });

      const trans = transRes.rows[0];

      if (trans.type === 'BUY') {
        // Portföyden sil, bakiye geri ver
        await pool.query('DELETE FROM portfolio WHERE user_id = $1 AND symbol = $2 AND buy_price = $3 AND quantity = $4 LIMIT 1', [userId, trans.symbol, trans.price, trans.quantity]);
        await pool.query('UPDATE profiles SET balance = balance + $1 WHERE user_id = $2', [parseFloat(trans.total_amount), userId]);
      } else if (trans.type === 'SELL') {
        // Bakiyeden düş, portföye geri ekle
        await pool.query('UPDATE profiles SET balance = balance - $1 WHERE user_id = $2', [parseFloat(trans.total_amount), userId]);
        await pool.query('INSERT INTO portfolio (user_id, symbol, name, quantity, buy_price, buy_date) VALUES ($1, $2, $3, $4, $5, $6)', [userId, trans.symbol, trans.name, trans.quantity, trans.price, trans.date]);
      } else if (trans.type === 'DEPOSIT') {
        await pool.query('UPDATE profiles SET balance = balance - $1, total_deposit = total_deposit - $1 WHERE user_id = $2', [parseFloat(trans.total_amount), userId]);
      } else if (trans.type === 'WITHDRAW') {
        await pool.query('UPDATE profiles SET balance = balance + $1, total_withdraw = total_withdraw - $1 WHERE user_id = $2', [parseFloat(trans.total_amount), userId]);
      }

      // İşlemi sil
      await pool.query('DELETE FROM transactions WHERE id = $1', [transId]);

      // Güncel veriyi döndür
      const portfolioRes = await pool.query('SELECT * FROM portfolio WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
      const allTransRes = await pool.query("SELECT * FROM transactions WHERE user_id = $1 AND type IN ('BUY', 'SELL') ORDER BY date DESC", [userId]);
      const profileRes = await pool.query('SELECT * FROM profiles WHERE user_id = $1', [userId]);
      const profile = profileRes.rows[0];

      res.json({
        portfolio: portfolioRes.rows.map(p => ({ id: String(p.id), symbol: p.symbol, name: p.name, quantity: p.quantity, buyPrice: parseFloat(p.buy_price), buyDate: p.buy_date, currentPrice: parseFloat(p.buy_price) })),
        transactions: allTransRes.rows.map(t => ({ id: String(t.id), type: t.type, symbol: t.symbol, name: t.name, quantity: t.quantity, price: parseFloat(t.price), totalAmount: parseFloat(t.total_amount), date: t.date })),
        account: { balance: parseFloat(profile.balance), totalDeposit: parseFloat(profile.total_deposit), totalWithdraw: parseFloat(profile.total_withdraw) },
      });
    } catch (error) {
      console.error('Delete transaction error:', error);
      res.status(500).json({ error: 'İşlem geri alma hatası' });
    }
  });

  // ============ TAKİP LİSTESİ ============
  app.get('/api/watchlist', authMiddleware, async (req, res) => {
    try {
      const userId = req.user.id;

      const groupsRes = await pool.query('SELECT * FROM watchlist_groups WHERE user_id = $1 ORDER BY created_at', [userId]);
      const itemsRes = await pool.query('SELECT * FROM watchlist_items WHERE user_id = $1', [userId]);

      const groups = groupsRes.rows.map(g => ({
        id: String(g.id),
        name: g.name,
        is_default: g.is_default,
        symbols: itemsRes.rows.filter(i => i.group_id === g.id).map(i => i.symbol),
      }));

      res.json({ groups });
    } catch (error) {
      console.error('Watchlist error:', error);
      res.status(500).json({ error: 'Takip listesi hatası' });
    }
  });

  app.post('/api/watchlist/groups', authMiddleware, async (req, res) => {
    try {
      const { name } = req.body;
      const result = await pool.query(
        'INSERT INTO watchlist_groups (user_id, name, is_default) VALUES ($1, $2, false) RETURNING *',
        [req.user.id, name]
      );
      res.json({ group: { id: String(result.rows[0].id), name: result.rows[0].name } });
    } catch (error) {
      res.status(500).json({ error: 'Grup oluşturma hatası' });
    }
  });

  app.delete('/api/watchlist/groups/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM watchlist_groups WHERE id = $1 AND user_id = $2 AND is_default = false', [req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Grup silme hatası' });
    }
  });

  app.patch('/api/watchlist/groups/:id', authMiddleware, async (req, res) => {
    try {
      const { name } = req.body;
      await pool.query('UPDATE watchlist_groups SET name = $1 WHERE id = $2 AND user_id = $3', [name, req.params.id, req.user.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Grup güncelleme hatası' });
    }
  });

  app.post('/api/watchlist/groups/:groupId/items', authMiddleware, async (req, res) => {
    try {
      const { symbol } = req.body;
      await pool.query(
        'INSERT INTO watchlist_items (group_id, user_id, symbol) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [req.params.groupId, req.user.id, symbol]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Hisse ekleme hatası' });
    }
  });

  app.delete('/api/watchlist/groups/:groupId/items/:symbol', authMiddleware, async (req, res) => {
    try {
      await pool.query(
        'DELETE FROM watchlist_items WHERE group_id = $1 AND user_id = $2 AND symbol = $3',
        [req.params.groupId, req.user.id, req.params.symbol]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Hisse silme hatası' });
    }
  });
}

module.exports = { setupPortfolioRoutes };
