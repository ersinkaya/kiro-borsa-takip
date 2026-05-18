const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

// JWT Secret - production'da env'den al
const JWT_SECRET = process.env.JWT_SECRET || 'borsa-takip-jwt-secret-2024-change-this';
const JWT_EXPIRES_IN = '7d';

// Google OAuth
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '604157898587-7nh1t1kp4f4gfm2oeb2sarvfo84f5foh.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const APP_URL = process.env.APP_URL || 'https://www.finanswebte.com';

// PostgreSQL bağlantısı
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'borsa_takip',
  user: process.env.DB_USER || 'borsa_user',
  password: process.env.DB_PASSWORD || 'BorsaTakip2024Secure!',
});

// Token oluştur
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// Token doğrula
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Auth middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Oturum gerekli' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş oturum' });
  }
  req.user = decoded;
  next();
}

// Auth route'larını Express app'e ekle
function setupAuthRoutes(app) {

  // ============ KAYIT ============
  app.post('/auth/register', async (req, res) => {
    try {
      const { email, password, full_name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
      }

      // Email kontrolü
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Bu e-posta zaten kayıtlı' });
      }

      // Şifre hash'le
      const passwordHash = await bcrypt.hash(password, 12);

      // Kullanıcı oluştur
      const result = await pool.query(
        'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id, email, full_name, created_at',
        [email, passwordHash, full_name || null]
      );

      const user = result.rows[0];

      // Profil oluştur
      await pool.query(
        'INSERT INTO profiles (user_id, balance, total_deposit, total_withdraw, interest_rate) VALUES ($1, 0, 0, 0, 50)',
        [user.id]
      );

      // Varsayılan takip listesi oluştur
      await pool.query(
        "INSERT INTO watchlist_groups (user_id, name, is_default) VALUES ($1, 'Takip Listem', true)",
        [user.id]
      );

      const token = generateToken(user);
      res.json({ user, token });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
    }
  });

  // ============ GİRİŞ ============
  app.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'E-posta ve şifre gerekli' });
      }

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }

      const user = result.rows[0];

      if (!user.password_hash) {
        return res.status(401).json({ error: 'Bu hesap Google ile oluşturulmuş. Google ile giriş yapın.' });
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
      }

      const token = generateToken(user);
      res.json({
        user: { id: user.id, email: user.email, full_name: user.full_name },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Giriş sırasında hata oluştu' });
    }
  });

  // ============ GOOGLE OAuth ============
  app.get('/auth/google', (req, res) => {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${APP_URL}/auth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get('/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.redirect('/?error=google_auth_failed');
      }

      // Code'u token'a çevir
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: `${APP_URL}/auth/google/callback`,
          grant_type: 'authorization_code',
        }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenData.access_token) {
        console.error('Google token error:', tokenData);
        return res.redirect('/?error=google_token_failed');
      }

      // Kullanıcı bilgilerini al
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const googleUser = await userInfoRes.json();

      if (!googleUser.email) {
        return res.redirect('/?error=google_email_not_found');
      }

      // Kullanıcıyı bul veya oluştur
      let result = await pool.query('SELECT * FROM users WHERE email = $1', [googleUser.email]);

      if (result.rows.length === 0) {
        // Yeni kullanıcı oluştur
        result = await pool.query(
          'INSERT INTO users (email, full_name, avatar_url, google_id) VALUES ($1, $2, $3, $4) RETURNING *',
          [googleUser.email, googleUser.name, googleUser.picture, googleUser.id]
        );

        const user = result.rows[0];

        // Profil oluştur
        await pool.query(
          'INSERT INTO profiles (user_id, balance, total_deposit, total_withdraw, interest_rate) VALUES ($1, 0, 0, 0, 50)',
          [user.id]
        );

        // Varsayılan takip listesi
        await pool.query(
          "INSERT INTO watchlist_groups (user_id, name, is_default) VALUES ($1, 'Takip Listem', true)",
          [user.id]
        );
      } else {
        // Mevcut kullanıcıyı güncelle
        await pool.query(
          'UPDATE users SET full_name = COALESCE($1, full_name), avatar_url = COALESCE($2, avatar_url), google_id = COALESCE($3, google_id) WHERE email = $4',
          [googleUser.name, googleUser.picture, googleUser.id, googleUser.email]
        );
      }

      const user = result.rows[0];
      const token = generateToken(user);

      // Token'ı frontend'e ilet (URL hash ile)
      res.redirect(`/#access_token=${token}`);
    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect('/?error=google_auth_error');
    }
  });

  // ============ OTURUM BİLGİSİ ============
  app.get('/auth/me', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT u.id, u.email, u.full_name, u.avatar_url, u.created_at FROM users u WHERE u.id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }
      res.json({ user: result.rows[0] });
    } catch (error) {
      res.status(500).json({ error: 'Sunucu hatası' });
    }
  });

  // ============ ŞİFRE DEĞİŞTİR ============
  app.post('/auth/change-password', authMiddleware, async (req, res) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);

      res.json({ message: 'Şifre başarıyla değiştirildi' });
    } catch (error) {
      res.status(500).json({ error: 'Şifre değiştirme hatası' });
    }
  });

  // ============ PROFİL GÜNCELLE ============
  app.post('/auth/update-profile', authMiddleware, async (req, res) => {
    try {
      const { full_name, email } = req.body;

      if (full_name) {
        await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [full_name, req.user.id]);
      }
      if (email) {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Bu e-posta başka bir hesapta kullanılıyor' });
        }
        await pool.query('UPDATE users SET email = $1 WHERE id = $2', [email, req.user.id]);
      }

      res.json({ message: 'Profil güncellendi' });
    } catch (error) {
      res.status(500).json({ error: 'Profil güncelleme hatası' });
    }
  });
}

module.exports = { setupAuthRoutes, authMiddleware, pool, verifyToken };
