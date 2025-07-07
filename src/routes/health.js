const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', (req, res) => {
  // MySQL bağlantısını test et
  pool.query('SELECT 1 as test', (err, results) => {
    if (err) {
      console.error('Health check MySQL hatası:', err.message);
      return res.status(500).json({ 
        status: 'error', 
        db: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ 
      status: 'ok', 
      db: 'connected',
      timestamp: new Date().toISOString(),
      result: results[0]
    });
  });
});

// Debug endpoint - ortam değişkenlerini göster (güvenlik için production'da kaldırın)
router.get('/debug', (req, res) => {
  res.json({
    MYSQL_HOST: process.env.MYSQL_HOST || 'NOT_SET',
    MYSQL_PORT: process.env.MYSQL_PORT || 'NOT_SET',
    MYSQL_DATABASE: process.env.MYSQL_DATABASE || 'NOT_SET',
    MYSQL_USER: process.env.MYSQL_USER || 'NOT_SET',
    MYSQL_PASSWORD: process.env.MYSQL_PASSWORD ? 'SET' : 'NOT_SET',
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 