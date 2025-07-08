const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

// Kullanıcı kaydı
exports.register = async (req, res) => {
  try {
    const { username, email, password, role = 'employee' } = req.body;

    // Gerekli alanları kontrol et
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Kullanıcı adı, email ve şifre gerekli',
        error: 'MISSING_FIELDS'
      });
    }

    // Email formatını kontrol et
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Geçersiz email formatı',
        error: 'INVALID_EMAIL'
      });
    }

    // Şifre güvenliğini kontrol et (en az 6 karakter)
    if (password.length < 6) {
      return res.status(400).json({
        message: 'Şifre en az 6 karakter olmalı',
        error: 'WEAK_PASSWORD'
      });
    }

    // Rol kontrolü (sadece admin ve employee)
    if (role !== 'admin' && role !== 'employee') {
      return res.status(400).json({
        message: 'Geçersiz rol. Sadece admin veya employee olabilir',
        error: 'INVALID_ROLE'
      });
    }

    // Kullanıcının zaten var olup olmadığını kontrol et
    const [existingUsers] = await pool.promise().query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: 'Bu kullanıcı adı veya email zaten kullanımda',
        error: 'USER_EXISTS'
      });
    }

    // Şifreyi hash'le
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Kullanıcıyı veritabanına ekle
    const [result] = await pool.promise().query(
      'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [username, email, passwordHash, role]
    );

    // JWT token oluştur
    const token = jwt.sign(
      { 
        id: result.insertId, 
        username, 
        email, 
        role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: result.insertId,
        username,
        email,
        role
      },
      token
    });

  } catch (error) {
    console.error('Kayıt hatası:', error);
    res.status(500).json({
      message: 'Sunucu hatası',
      error: 'INTERNAL_ERROR'
    });
  }
};

// Kullanıcı girişi
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Gerekli alanları kontrol et
    if (!username || !password) {
      return res.status(400).json({
        message: 'Kullanıcı adı ve şifre gerekli',
        error: 'MISSING_FIELDS'
      });
    }

    // Kullanıcıyı bul
    const [users] = await pool.promise().query(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE username = ? OR email = ?',
      [username, username]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: 'Geçersiz kullanıcı adı veya şifre',
        error: 'INVALID_CREDENTIALS'
      });
    }

    const user = users[0];

    // Hesabın aktif olup olmadığını kontrol et
    if (!user.is_active) {
      return res.status(401).json({
        message: 'Hesabınız devre dışı bırakılmış',
        error: 'ACCOUNT_DISABLED'
      });
    }

    // Şifreyi kontrol et
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Geçersiz kullanıcı adı veya şifre',
        error: 'INVALID_CREDENTIALS'
      });
    }

    // JWT token oluştur
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Giriş başarılı',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      },
      token
    });

  } catch (error) {
    console.error('Giriş hatası:', error);
    res.status(500).json({
      message: 'Sunucu hatası',
      error: 'INTERNAL_ERROR'
    });
  }
};

// Kullanıcı profilini getir
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.promise().query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: 'Kullanıcı bulunamadı',
        error: 'USER_NOT_FOUND'
      });
    }

    res.json({
      user: users[0]
    });

  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({
      message: 'Sunucu hatası',
      error: 'INTERNAL_ERROR'
    });
  }
};

// Şifre değiştirme
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Mevcut şifre ve yeni şifre gerekli',
        error: 'MISSING_FIELDS'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'Yeni şifre en az 6 karakter olmalı',
        error: 'WEAK_PASSWORD'
      });
    }

    // Mevcut şifreyi kontrol et
    const [users] = await pool.promise().query(
      'SELECT password_hash FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        message: 'Kullanıcı bulunamadı',
        error: 'USER_NOT_FOUND'
      });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        message: 'Mevcut şifre yanlış',
        error: 'INVALID_PASSWORD'
      });
    }

    // Yeni şifreyi hash'le ve güncelle
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    await pool.promise().query(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({
      message: 'Şifre başarıyla değiştirildi'
    });

  } catch (error) {
    console.error('Şifre değiştirme hatası:', error);
    res.status(500).json({
      message: 'Sunucu hatası',
      error: 'INTERNAL_ERROR'
    });
  }
}; 