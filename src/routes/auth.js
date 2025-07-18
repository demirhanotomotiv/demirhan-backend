const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');



// Kullanıcı girişi
router.post('/login', authController.login);

// Kullanıcı profilini getir
router.get('/profile', authenticateToken, authController.getProfile);

// Şifre değiştirme
router.put('/change-password', authenticateToken, authController.changePassword);

// Test kullanıcısı oluştur (sadece geliştirme ortamında)
router.post('/create-test-user', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { pool } = require('../config/db');
    
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash('password123', saltRounds);
    
    const [result] = await pool.promise().query(
      'INSERT INTO personnel (name, username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      ['Test Admin', 'admin', 'admin@ulas.com', passwordHash, 'admin', 1]
    );
    
    res.status(201).json({
      message: 'Test kullanıcısı oluşturuldu',
      user: {
        id: result.insertId,
        username: 'admin',
        email: 'admin@ulas.com',
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Test kullanıcısı oluşturma hatası:', error);
    res.status(500).json({
      message: 'Test kullanıcısı oluşturulamadı',
      error: error.message
    });
  }
});

module.exports = router; 