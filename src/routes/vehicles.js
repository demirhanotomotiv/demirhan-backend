const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth');
const Activity = require('../models/activityModel');

// Tüm araçları getir
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('=== VEHICLES API CALL ===');
    console.log('Vehicles GET endpoint called by user:', req.user.id);
    console.log('User role:', req.user.role);
    console.log('Request headers:', req.headers);
    
    const [vehicles] = await req.app.locals.pool.promise().query(
      'SELECT id, plate, brand, model, year, color, created_at FROM vehicles ORDER BY created_at DESC'
    );
    
    console.log('Vehicles query result:', vehicles.length, 'vehicles found');
    console.log('First vehicle:', vehicles[0]);
    
    res.json({
      success: true,
      data: vehicles
    });
    
    console.log('=== VEHICLES API RESPONSE SENT ===');
  } catch (error) {
    console.error('Araçları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araçlar alınırken hata oluştu',
      error: error.message
    });
  }
});

// Tek araç getir
router.get('/:plate', authenticateToken, async (req, res) => {
  try {
    const { plate } = req.params;
    
    const [vehicles] = await req.app.locals.pool.promise().query(
      'SELECT * FROM vehicles WHERE plate = ?',
      [plate]
    );
    
    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }
    
    res.json({
      success: true,
      data: vehicles[0]
    });
  } catch (error) {
    console.error('Araç getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç alınırken hata oluştu',
      error: error.message
    });
  }
});

// Yeni araç ekle
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { plate, brand, model, year, fuel_type, status } = req.body;
    const userId = req.user.id;

    // Validasyon
    if (!plate || !brand || !model || !year) {
      return res.status(400).json({
        success: false,
        message: 'Plaka, marka, model ve yıl zorunludur'
      });
    }

    // Plaka formatını kontrol et (geçici olarak kaldırıldı)
    // const plateRegex = /^[0-9]{1,2}[A-Z]{1,3}[0-9]{2,4}$/;
    // if (!plateRegex.test(plate.toUpperCase())) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Geçersiz plaka formatı. Örnek: 34ABC123, 06XYZ45'
    //   });
    // }

    // Yıl kontrolü
    const currentYear = new Date().getFullYear();
    if (year < 1900 || year > currentYear + 1) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz yıl'
      });
    }

    // Aynı plakada araç var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE plate = ?',
      [plate.toUpperCase()]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu plakaya sahip araç zaten mevcut'
      });
    }

    const [result] = await req.app.locals.pool.promise().query(
      'INSERT INTO vehicles (plate, brand, model, year) VALUES (?, ?, ?, ?)',
      [plate.toUpperCase(), brand, model, year]
    );

    const [newVehicle] = await req.app.locals.pool.promise().query(
      'SELECT * FROM vehicles WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Araç başarıyla eklendi',
      data: newVehicle[0]
    });
    // Activity log
    try { await Activity.create(userId, 'Araç eklendi', { plate, brand, model, year }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('Araç ekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç eklenirken hata oluştu',
      error: error.message
    });
  }
});

// Araç güncelle
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { plate, brand, model, year, fuel_type, status } = req.body;
    const userId = req.user.id;

    // Validasyon
    if (!plate || !brand || !model || !year) {
      return res.status(400).json({
        success: false,
        message: 'Plaka, marka, model ve yıl zorunludur'
      });
    }

    // Plaka formatını kontrol et (geçici olarak kaldırıldı)
    // const plateRegex = /^[0-9]{1,2}[A-Z]{1,3}[0-9]{2,4}$/;
    // if (!plateRegex.test(plate.toUpperCase())) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Geçersiz plaka formatı. Örnek: 34ABC123, 06XYZ45'
    //   });
    // }

    // Araç var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    // Aynı plakada başka araç var mı kontrol et
    const [duplicate] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE plate = ? AND id != ?',
      [plate.toUpperCase(), id]
    );

    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Bu plakaya sahip başka bir araç zaten mevcut'
      });
    }

    await req.app.locals.pool.promise().query(
      'UPDATE vehicles SET plate = ?, brand = ?, model = ?, year = ? WHERE id = ?',
      [plate.toUpperCase(), brand, model, year, id]
    );

    const [updatedVehicle] = await req.app.locals.pool.promise().query(
      'SELECT * FROM vehicles WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Araç başarıyla güncellendi',
      data: updatedVehicle[0]
    });
    // Activity log
    try { await Activity.create(userId, 'Araç güncellendi', { id, plate, brand, model, year }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('Araç güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç güncellenirken hata oluştu',
      error: error.message
    });
  }
});

// Araç sil
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Araç var mı kontrol et
    const [existing] = await req.app.locals.pool.promise().query(
      'SELECT id FROM vehicles WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    // Bu araçla ilgili işlemler var mı kontrol et
    const [transactions] = await req.app.locals.pool.promise().query(
      'SELECT id FROM transactions WHERE vehicle_id = ? LIMIT 1',
      [id]
    );

    if (transactions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu araçla ilgili işlemler bulunduğu için silinemez'
      });
    }

    await req.app.locals.pool.promise().query(
      'DELETE FROM vehicles WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Araç başarıyla silindi'
    });
    // Activity log
    try { await Activity.create(req.user.id, 'Araç silindi', { id }); } catch (e) { console.error('Activity log error:', e); }
  } catch (error) {
    console.error('Araç silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç silinirken hata oluştu',
      error: error.message
    });
  }
});

// Araç istatistikleri
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const [stats] = await req.app.locals.pool.promise().query(`
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(*) as active_vehicles,
        0 as maintenance_vehicles,
        0 as inactive_vehicles
      FROM vehicles
    `);
    
    res.json({
      success: true,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Araç istatistikleri hatası:', error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınırken hata oluştu',
      error: error.message
    });
  }
});

module.exports = router; 