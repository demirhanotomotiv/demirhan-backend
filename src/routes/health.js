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

// Veritabanı verilerini kontrol et
router.get('/data-check', (req, res) => {
  pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM vehicles) as vehicle_count,
      (SELECT COUNT(*) FROM personnel) as personnel_count,
      (SELECT COUNT(*) FROM transaction_categories) as category_count
  `, (err, results) => {
    if (err) {
      console.error('Data check MySQL hatası:', err.message);
      return res.status(500).json({ 
        status: 'error', 
        error: err.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      data: results[0],
      timestamp: new Date().toISOString()
    });
  });
});

// Araçları listele
router.get('/vehicles', (req, res) => {
  pool.query('SELECT plate, brand, model, year, status, is_active FROM vehicles LIMIT 10', (err, results) => {
    if (err) {
      console.error('Vehicles check MySQL hatası:', err.message);
      return res.status(500).json({ 
        status: 'error', 
        error: err.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  });
});

// Personeli listele
router.get('/personnel', (req, res) => {
  pool.query('SELECT id, full_name, email, status, is_active FROM personnel LIMIT 10', (err, results) => {
    if (err) {
      console.error('Personnel check MySQL hatası:', err.message);
      return res.status(500).json({ 
        status: 'error', 
        error: err.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  });
});

// Kategorileri listele
router.get('/categories', (req, res) => {
  pool.query('SELECT id, name FROM transaction_categories LIMIT 10', (err, results) => {
    if (err) {
      console.error('Categories check MySQL hatası:', err.message);
      return res.status(500).json({ 
        status: 'error', 
        error: err.message
      });
    }
    
    res.json({ 
      status: 'ok', 
      data: results,
      count: results.length,
      timestamp: new Date().toISOString()
    });
  });
});

module.exports = router; 