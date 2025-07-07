const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', (req, res) => {
  db.query('SELECT 1', (err) => {
    if (err) {
      return res.status(500).json({ status: 'error', db: 'disconnected' });
    }
    res.json({ status: 'ok', db: 'connected' });
  });
});

module.exports = router; 