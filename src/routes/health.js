const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  // MySQL bağlantısını test et
  db.query('SELECT 1 as test', (err, results) => {
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

module.exports = router; 