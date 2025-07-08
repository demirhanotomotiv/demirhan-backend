const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

// Kullanıcı kaydı (herkes erişebilir)
router.post('/register', authController.register);

// Kullanıcı girişi (herkes erişebilir)
router.post('/login', authController.login);

// Kullanıcı profilini getir (sadece giriş yapmış kullanıcılar)
router.get('/profile', authenticateToken, authController.getProfile);

// Şifre değiştirme (sadece giriş yapmış kullanıcılar)
router.put('/change-password', authenticateToken, authController.changePassword);

module.exports = router; 